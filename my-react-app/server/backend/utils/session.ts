export function getSessionToken() {
  return localStorage.getItem("session_token") || sessionStorage.getItem("session_token");
}

export function isLoggedIn() {
  const token = getSessionToken();
  return !!token;
}
