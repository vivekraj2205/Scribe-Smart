const signup_link = document.querySelector("#signup");
const login_form = document.querySelector(".container");
const signup_form = document.querySelector(".signup_form");

signup_link.addEventListener('click', () =>{
  login_form.style.display = "none";
  signup_form.style.display = "block";
});

// If you want to toggle back to the login form when the "login" link is clicked
const login_link = document.querySelector("#login"); // Add an ID to your login link
login_link.addEventListener('click', () =>{
  login_form.style.display = "block";
  signup_form.style.display = "none";
});
