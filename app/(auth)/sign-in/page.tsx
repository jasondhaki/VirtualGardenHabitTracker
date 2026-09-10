import { signIn } from "@/auth";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">Sign in to Habit Garden</h1>
      <form
        action={async () => {
          "use server";
          await signIn("github");
        }}
      >
        <button
          type="submit"
          className="rounded-md bg-black px-4 py-2 text-white"
        >
          Continue with GitHub
        </button>
      </form>
      <form
        action={async () => {
          "use server";
          await signIn("google");
        }}
      >
        <button
          type="submit"
          className="rounded-md border border-gray-300 px-4 py-2"
        >
          Continue with Google
        </button>
      </form>
    </main>
  );
}
