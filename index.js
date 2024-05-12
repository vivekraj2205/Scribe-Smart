const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const record = require('node-record-lpcm16');
const speech = require('@google-cloud/speech');
var mysql = require('mysql');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const client = new speech.SpeechClient();
const app = express();
const port = 3000;

app.use(cookieParser());

const diarizationConfig = {
  enableSpeakerDiarization: true,
  minSpeakerCount: 2,
  maxSpeakerCount: 4,
};

const request = {
  config: {
    encoding: 'LINEAR16',
    sampleRateHertz: 16000,
    languageCode: 'en-US',
    diarizationConfig: diarizationConfig,
    enableAutomaticPunctuation : true,
  },
  interimResults: false,
};


var con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "password",
    database: "mydata"
});
  
con.connect(function(err) {
    if (err) throw err;
    console.log("Connected!");
    // con.query("CREATE DATABASE mydb", function (err, result) {
    //   if (err) throw err;
    //   console.log("Database created");
    // });
    // var sql = "CREATE TABLE users (name VARCHAR(255), password VARCHAR(255))";
    // con.query(sql, function (err, result) {
    //   if (err) throw err;
    //   console.log("Table created");
    // });
});
  

// Define the directory where your static files (like HTML, CSS, images) reside
const publicDirectoryPath = path.join(__dirname, 'public');

// Serve static files from the 'public' directory
app.use(express.static(publicDirectoryPath));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Define your endpoint to serve the HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(publicDirectoryPath, 'login.html'));
});

app.post('/signup',(req,res)=>{
    const {username,password1,password2} = req.body;
    console.log(`username: ${username}, password1: ${password1}, password2: ${password2}`);

    if(password1 != password2){
      res.status(401).json({ message: 'Passwords do not match' });
    }
    else{
      var sql = `INSERT INTO users (name, password) VALUES ('${username}', '${password1}')`;
      con.query(sql, function (err, result) {
        if (err) throw err;
        console.log("User added");
      });
      res.sendFile(path.join(publicDirectoryPath, 'login.html'));
    }

});

app.post('/auth',(req,res)=>{
    const {username,password} = req.body;
    console.log(`username: ${username}, password: ${password}`);

    var sql = `SELECT * FROM users WHERE name = '${username}' AND password = '${password}'`;
    con.query(sql, function (err, result) {
      if (err) throw err;
      console.log(result);
      if(result.length > 0){
        res.cookie('username', username, { maxAge: 900000, httpOnly: false });
        res.sendFile(path.join(publicDirectoryPath, 'upload.html'));
      }else{
        res.status(401).json({ message: 'Invalid credentials' });
      }
  })
});

// Start the server
app.listen(port, '0.0.0.0',() => {
  console.log(`Server is up on port ${port}`);
});

var recording;

app.post('/starttrans', (req, res) => {
  console.log("recv start")
  
  // Create a new recording object each time you start a new recording
  recording = record.record();
  let shouldStopTranscription = false; // Flag to control transcription

  var recognizeStream = client
    .streamingRecognize(request)
    .on('error', (err) => {
      console.error('Error in transcription:', err);
      recording.stop();
      res.end();
    })
    .on('data', async (data) => {
      if (data.results[0] && data.results[0].alternatives[0]) {
        const text = data.results[0].alternatives[0].transcript;
        console.log(`Transcription: ${text}`);
  
        if (text.toLowerCase().includes('stop over finish')) {
          console.log('Stop keyword detected, ending transcription for current question');
          shouldStopTranscription = true; // Set flag to stop transcription
          recording = null; // Reset the stream
          recognizeStream.destroy();
          res.end();
        }
  
        if (!shouldStopTranscription) {
          res.write(text); // Write to response if shouldStopTranscription is false
        }
      } else {
        console.log(`\n\nReached transcription time limit, press Ctrl+C\n`);
      }
    });
  

  recording.stream().pipe(recognizeStream);
});

app.post('/stoptrans', (req, res) => {
  if (recording) {
    recording.stop();
    console.log("stopped");
    res.end(); // End the response
  }
});

