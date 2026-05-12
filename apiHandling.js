// User APIS
async function apiRegister(userName, email, password, pin) {
  return fetch("http://localhost:3000/api/users/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userName,
      email,
      password,
      pin,
    }),
  }).then((res) => res.json());
}

async function apiLogin(email, password) {
  return fetch("http://localhost:3000/api/users/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
    }),
  }).then((res) => res.json());
}

async function apiGetUser() {
  return fetch("http://localhost:3000/api/users", {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  }).then((res) => res.json());
}

async function apiCheckPin(pin) {
  return fetch("http://localhost:3000/api/users/pin", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
    body: JSON.stringify({
      pin: pin,
    }),
  }).then((res) => res.json());
}

async function apiFastLogin() {
  return fetch("http://localhost:3000/api/users/fastLogin", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  }).then((res) => res.json());
}

async function apiEditUser(data) {
  const formData = new FormData();
  formData.append("userName", data.userName);
  if (data.avatar instanceof File) {
    formData.append("avatar", data.avatar);
  }

  return fetch("http://localhost:3000/api/users", {
    method: "PATCH",
    headers: {
      authorization: `Bearer ${localStorage.getItem("token")}`,
    },
    body: formData,
  })
    .then((res) => res.json())
    .then((data) => {
      console.log(data);
      localStorage.setItem("token", data.data);
      return data;
    });
}

async function apiChangePassword(oldPassword, newPassword) {
  return fetch("http://localhost:3000/api/users/password", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
    body: JSON.stringify({
      oldPassword,
      newPassword,
    }),
  })
    .then((res) => res.json())
    .then((data) => data);
}
// Cycles APIS
async function apiGetCycle() {
  return fetch("http://localhost:3000/api/cycle", {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  }).then((res) => res.json());
}

async function apiInitCycle(totalAmount, cycleName, startDate, endDate) {
  return fetch("http://localhost:3000/api/cycle", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
    body: JSON.stringify({ totalAmount, cycleName, startDate, endDate }),
  }).then((res) => res.json());
}

async function apiDeleteCycle(cycleId) {
  return fetch(`http://localhost:3000/api/cycle/${cycleId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  }).then((res) => res.json());
}

// Transactions APIS
async function apiGetTransactions() {
  return fetch("http://localhost:3000/api/transaction", {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  }).then((res) => res.json());
}

async function apiAddTransaction(amount, category, note) {
  return fetch("http://localhost:3000/api/transaction", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
    body: JSON.stringify({ amount, category, note }),
  }).then((res) => res.json());
}

async function apiDeleteTransaction(transId) {
  return fetch(`http://localhost:3000/api/transaction/${transId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  }).then((res) => res.json());
}

// Fast login
async function fastLogin() {
  if (!localStorage.getItem("token")) return;
  const data = await apiFastLogin();
  if (data.status == "success") {
    localStorage.setItem("token", data.data);
    const user = await apiGetUser();
    document.getElementById("welcome-username").textContent =
      user.data.userName;
    navigateTo("lock-screen");
  }
}

// Alert APIS
async function apiGetAlert() {
  return fetch("http://localhost:3000/api/alert", {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  })
    .then((res) => res.json())
    .then((data) => data);
}
async function apiChangeAlert(alert) {
  return fetch("http://localhost:3000/api/alert", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
    body: JSON.stringify({
      alert,
    }),
  })
    .then((res) => res.json())
    .then((data) => data);
}
