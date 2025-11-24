import { createStore } from "@lib";

export const authStore = createStore({
  email: "",
  sessionId: "",
});

export const checkAuth = () => {
  if (
    authStore.select((state) => state.email)() === "" ||
    authStore.select((state) => state.sessionId)() === ""
  ) {
    throw Error("401 Unauthorized");
  }
  return "200 OK";
};

function customHash(input: string): number {
  const PRIME_BASE = 31;

  // Use current timestamp as seed
  let hash = Date.now() >>> 0;

  for (let i = 0; i < input.length; i++) {
    const charCode = input.charCodeAt(i);
    hash = (hash * PRIME_BASE + charCode) >>> 0;
  }

  return hash;
}

export const login = (email: string, password: string) => {
  authStore.set(() => ({
    sessionId: customHash(password).toString(),
    email: email,
  }));
};

export const logout = () => {
  authStore.set({
    sessionId: "",
    email: "",
  });
};
