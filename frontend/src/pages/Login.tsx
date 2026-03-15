import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../services/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Spinner } from '../components/ui/Avatar';
import { LogIn, UserPlus, Mail, Lock, User } from 'lucide-react';
import toast from 'react-hot-toast';

interface LoginProps {
    setAuth: (value: boolean) => void;
}

export default function Login({ setAuth }: LoginProps) {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = isLogin
                ? await auth.login(email, password)
                : await auth.register(email, password, fullName);

            localStorage.setItem('token', response.data.token);
            setAuth(true);
            toast.success(isLogin ? 'Welcome back!' : 'Account created successfully!');
            navigate('/');
        } catch (err: any) {
            const errorMsg = err.response?.data?.error || 'An error occurred';
            setError(errorMsg);
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-500 to-accent-500 flex items-center justify-center p-4">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-400 rounded-full opacity-20 blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent-400 rounded-full opacity-20 blur-3xl" />
            </div>

            {/* Card */}
            <div className="relative w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-8 text-center text-white">
                        <div className="flex justify-center mb-4">
                            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                {isLogin ? (
                                    <LogIn size={32} />
                                ) : (
                                    <UserPlus size={32} />
                                )}
                            </div>
                        </div>
                        <h1 className="text-3xl font-bold">CRM Pro</h1>
                        <p className="text-primary-100 mt-2">
                            {isLogin ? 'Welcome back!' : 'Create your account'}
                        </p>
                    </div>

                    {/* Form */}
                    <div className="p-8">
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {!isLogin && (
                                <div>
                                    <Label htmlFor="fullName" className="mb-2 block">
                                        <div className="flex items-center gap-2">
                                            <User size={16} />
                                            Full Name
                                        </div>
                                    </Label>
                                    <Input
                                        id="fullName"
                                        type="text"
                                        placeholder="John Doe"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        required={!isLogin}
                                    />
                                </div>
                            )}

                            <div>
                                <Label htmlFor="email" className="mb-2 block">
                                    <div className="flex items-center gap-2">
                                        <Mail size={16} />
                                        Email Address
                                    </div>
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>

                            <div>
                                <Label htmlFor="password" className="mb-2 block">
                                    <div className="flex items-center gap-2">
                                        <Lock size={16} />
                                        Password
                                    </div>
                                </Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>

                            {error && (
                                <div className="p-4 bg-danger-50 border border-danger-200 rounded-lg">
                                    <p className="text-sm text-danger-700">{error}</p>
                                </div>
                            )}

                            <Button
                                type="submit"
                                fullWidth
                                size="lg"
                                disabled={loading}
                                className="mt-6"
                            >
                                {loading ? (
                                    <div className="flex items-center gap-2">
                                        <Spinner size="sm" />
                                        <span>Loading...</span>
                                    </div>
                                ) : (
                                    isLogin ? 'Sign In' : 'Create Account'
                                )}
                            </Button>
                        </form>

                        {/* Toggle */}
                        <div className="mt-6 pt-6 border-t border-neutral-200 text-center">
                            <p className="text-sm text-neutral-600 mb-4">
                                {isLogin ? "Don't have an account?" : 'Already have an account?'}
                            </p>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsLogin(!isLogin);
                                    setError('');
                                    setEmail('');
                                    setPassword('');
                                    setFullName('');
                                }}
                                className="text-primary-600 hover:text-primary-700 font-semibold transition-colors"
                            >
                                {isLogin ? 'Sign up here' : 'Sign in here'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-white/80 text-sm mt-6">
                    v3.0.0 • Retail Edition
                </p>
            </div>
        </div>
    );
}
