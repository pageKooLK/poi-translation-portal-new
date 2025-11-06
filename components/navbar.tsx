'use client';

import { useAuth } from '@/app/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Globe, LogOut, Loader2, User } from 'lucide-react';
import { useState } from 'react';

export function Navbar() {
  const { user, signOut, loading } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut();
    // setIsSigningOut will be reset when the page redirects
  };

  return (
    <nav className="border-b bg-white shadow-sm">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo and Title */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg shadow-md">
              <Globe className="h-6 w-6 text-white" />
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">POI Translation Portal</h1>
              <Badge variant="outline" className="text-xs">v1.0</Badge>
            </div>
          </div>

          {/* Right side - User info and Logout */}
          <div className="flex items-center gap-4">
            {loading ? (
              // Show loading state
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>載入中...</span>
              </div>
            ) : user ? (
              // Show user info and logout when logged in
              <>
                {/* User Email Display */}
                <div className="hidden sm:flex items-center gap-2 text-sm text-gray-600">
                  <User className="h-4 w-4" />
                  <span className="max-w-[200px] truncate">{user.email}</span>
                </div>

                {/* Separator */}
                <div className="h-8 w-px bg-gray-200" />

                {/* Logout Button */}
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="min-w-[80px]"
                >
                  {isSigningOut ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      登出中
                    </>
                  ) : (
                    <>
                      <LogOut className="mr-2 h-4 w-4" />
                      登出
                    </>
                  )}
                </Button>
              </>
            ) : (
              // Show nothing when not logged in (middleware will redirect)
              <div className="text-sm text-gray-500">未登入</div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}