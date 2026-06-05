import NextAuth from "next-auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [],
  callbacks: {
    authorized({ auth: session }) {
      return session?.user != null;
    },
  },
});
