// export const TOKEN_KEY = 'carventory_auth_token';

// export const login = (token: string) => {
//   localStorage.setItem(TOKEN_KEY, token);
// };

// export const logout = () => {
//   localStorage.removeItem(TOKEN_KEY);
// };

// export const getToken = (): string | null => {
//   return localStorage.getItem(TOKEN_KEY);
// };

// export const isAuthenticated = (): boolean => {
//   return !!getToken(); // Returns true if token exists, false otherwise
// };


export const TOKEN_KEY = 'carventory_auth_token';
const TOKEN_TIMESTAMP_KEY = 'carventory_auth_token_timestamp';
// const TOKEN_EXPIRY_MS = 60 * 1000; // 1 minute for testing
const TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

export const login = (token: string) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(TOKEN_TIMESTAMP_KEY, Date.now().toString());
};

export const logout = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_TIMESTAMP_KEY);
};

export const getToken = (): string | null => {
  const token = localStorage.getItem(TOKEN_KEY);
  const timestamp = localStorage.getItem(TOKEN_TIMESTAMP_KEY);

  if (!token || !timestamp) return null;

  const tokenTime = parseInt(timestamp, 10);
  if (Date.now() - tokenTime > TOKEN_EXPIRY_MS) {
    logout(); // Token expired
    return null;
  }

  return token;
};

export const isAuthenticated = (): boolean => {
  return !!getToken(); // Automatically checks expiry
};
