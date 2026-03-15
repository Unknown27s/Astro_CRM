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
            toast.success(isLogin ? 'Welcome to AstroCRM!' : 'Account created successfully!');
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
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-primary-900 to-primary-800 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Animated background elements - 3D effect */}
            <div className="absolute inset-0 overflow-hidden">
                {/* Large gradient orbs */}
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-600 rounded-full opacity-30 blur-3xl animate-pulse" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent-600 rounded-full opacity-25 blur-3xl animate-pulse" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-primary-500 rounded-full opacity-10 blur-3xl" />

                {/* Animated accent lines */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary-400 to-transparent opacity-20 animate-pulse" />
                <div className="absolute bottom-0 right-0 w-full h-1 bg-gradient-to-l from-transparent via-accent-400 to-transparent opacity-20 animate-pulse" />
            </div>

            {/* Card with 3D perspective */}
            <div className="relative w-full max-w-md z-10">
                {/* 3D Shadow effect */}
                <div className="absolute inset-0 bg-gradient-to-b from-primary-400/20 to-transparent rounded-3xl blur-2xl transform scale-105" />

                {/* Main card */}
                <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden border border-white/20 transform transition-transform duration-500 hover:shadow-3xl">
                    {/* Header with gradient */}
                    <div className="bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 p-8 text-center text-white relative overflow-hidden">
                        {/* Gradient overlay background */}
                        <div className="absolute inset-0 opacity-20">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-primary-400 rounded-full blur-2xl" />
                        </div>

                        <div className="relative z-10">
                            {/* Icon with 3D effect */}
                            <div className="flex justify-center mb-6">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-white/30 rounded-2xl blur-xl transform scale-110" />
                                    <div className="relative p-4 bg-gradient-to-br from-white/30 to-white/10 rounded-2xl backdrop-blur-lg border border-white/40 shadow-2xl">
                                        {isLogin ? (
                                            <LogIn size={36} className="text-white drop-shadow-lg" />
                                        ) : (
                                            <UserPlus size={36} className="text-white drop-shadow-lg" />
                                        )}
                                    </div>
                                </div>
                            </div>

                            <h1 className="text-4xl font-bold tracking-tight drop-shadow-lg">AstroCRM</h1>
                            <p className="text-primary-100 mt-2 text-lg font-semibold">
                                {isLogin ? 'Retail Management Platform' : 'Join AstroCRM Today'}
                            </p>
                            <p className="text-primary-50 mt-3 text-sm leading-relaxed max-w-xs mx-auto">
                                {isLogin
                                    ? 'Manage customers, inventory, and campaigns with AI-powered insights'
                                    : 'Take control of your retail business with intelligent CRM solutions'}
                            </p>
                        </div>
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
                                    <p className="text-xs text-neutral-500 mt-1">Your full name for your business profile</p>
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
                                <p className="text-xs text-neutral-500 mt-1">We'll never share your email</p>
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
                                <p className="text-xs text-neutral-500 mt-1">
                                    {!isLogin ? 'Minimum 6 characters recommended' : 'Case-sensitive'}
                                </p>
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

                {/* Footer branding */}
                <div className="text-center space-y-2 mt-8">
                    <p className="text-white/70 text-xs tracking-widest font-semibold uppercase">
                        AstroCRM v3.0.0 • Retail Edition
                    </p>
                    <p className="text-white/50 text-xs">
                        Powered by AI • Built for Growth
                    </p>
                </div>
            </div>
        </div>
    );
}
