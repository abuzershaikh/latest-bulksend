import { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

export default function Login() {
    const [error, setError] = useState('');

    const handleGoogleSignIn = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (err) {
            setError(err.message);
            console.error(err);
        }
    };

    return (
        <div className="min-h-screen bg-dark-900 px-4 py-8 text-white">
            <div className="mx-auto flex min-h-[80vh] max-w-xl items-center justify-center">
                <section className="w-full rounded-[36px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.18),_transparent_40%),linear-gradient(180deg,_rgba(255,255,255,0.06),_rgba(255,255,255,0.02))] p-8 shadow-2xl md:p-10">
                    <div className="text-center">
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200">OpenLeads Reseller Dashboard</p>
                        <h1 className="mt-3 text-3xl font-bold text-white md:text-4xl">Resell and Earn with OpenLeads</h1>
                    </div>

                    {error && (
                        <div className="mt-6 rounded-2xl border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-100">
                            {error}
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        className="mt-6 flex w-full items-center justify-center gap-3 rounded-full bg-white px-4 py-3 font-semibold text-slate-900 transition hover:bg-slate-100"
                    >
                        <svg className="h-5 w-5" viewBox="0 0 24 24">
                            <path
                                fill="currentColor"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                                fill="#34A853"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                                fill="#FBBC05"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            />
                            <path
                                fill="#EA4335"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            />
                        </svg>
                        Sign in with Google
                    </button>
                </section>
            </div>
        </div>
    );
}
