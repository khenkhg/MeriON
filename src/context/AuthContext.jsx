
import { createContext, useContext, useState } from "react";
import { demoUsers } from "../data/users";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("merion_user")) || null;
    } catch {
      return null;
    }
  });

  const login = (email, password) => {
    const registered = JSON.parse(
      localStorage.getItem("merion_registered") || "[]"
    );

    const allUsers = [...demoUsers, ...registered];

    const found = allUsers.find(
      (u) =>
        u.email.toLowerCase() === email.trim().toLowerCase() &&
        u.password === password
    );

    if (!found) return false;

    const { password: _, ...safeUser } = found;

    setUser(safeUser);
    localStorage.setItem("merion_user", JSON.stringify(safeUser));

    return true;
  };

  const signup = (name, email, password) => {
    const registered = JSON.parse(
      localStorage.getItem("merion_registered") || "[]"
    );

    const allUsers = [...demoUsers, ...registered];

    const exists = allUsers.some(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase()
    );

    if (exists) return false;

    registered.push({
      id: Date.now(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      role: "Employee",
    });

    localStorage.setItem(
      "merion_registered",
      JSON.stringify(registered)
    );

    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("merion_user");
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
