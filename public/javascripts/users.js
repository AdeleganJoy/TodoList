let contentElement = document.getElementById("content");

if (document.readyState !== "loading") {
    initializeCode();
  } else {
    document.addEventListener("DOMContentLoaded", function () {
      initializeCode();
    });
  }
  
  function initializeCode() {
    checkLoginStatus();

    
}
document.getElementById('add-item').addEventListener('keydown', handleEnterKey);
function handleEnterKey(event) {
    if (event.key === 'Enter') {
        event.preventDefault();

        const storedToken = localStorage.getItem('auth_token');
        const items = document.getElementById('add-item').value;
        fetch("/api/todos", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + storedToken
            },
            body: JSON.stringify({items})
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .catch(error => {
            console.error("Error:", error);
        });
        
    }
}
function checkLoginStatus() {
    const authToken = localStorage.getItem("auth_token");
    if (!authToken) {
        const loginLink = document.createElement('a');
        loginLink.href = '/login.html';
        loginLink.textContent = 'Login';
        contentElement.appendChild(loginLink);

        const registerLink = document.createElement('a');
        registerLink.href = '/register.html';
        registerLink.textContent = 'Register';
        contentElement.appendChild(registerLink);
    } else {
        fetch("/api/private", {
            method: "GET",
            headers: {
                "authorization": "Bearer " + authToken
            }
        })
        .then((response) => response.text())
        .then(data => {
            if (contentElement) {
                const [header, payload, signature] = authToken.split('.');
                const parsedPayload = JSON.parse(atob(payload));
                contentElement.innerHTML = parsedPayload.email;
                const btn = document.createElement("input");
                btn.type = "submit";

                btn.className = "btn";
                btn.value  = "Logout";
                btn.id = "logout";

                contentElement.appendChild(btn);
                
                const l1 = document.createElement("p")
                l1.innerText = data;
                
                contentElement.appendChild(l1);
                const logoutButton = document.getElementById("logout");
                if (logoutButton) {
                    logoutButton.addEventListener("click", logout);
                }

                
            } else {
                console.error("Element with ID 'content' not found");
            }
        })
        .catch((e) => {
            console.error("Error: " + e);
        });
    }
}


function logout(){
    localStorage.removeItem("auth_token");
    window.location.href = "/";
}