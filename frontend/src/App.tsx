import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ScriptGenerator } from './pages/ScriptGenerator';
import { ThumbnailGenerator } from './pages/ThumbnailGenerator';
import { ImageEditor } from './pages/ImageEditor';
import { Library } from './pages/Library';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { StoreProvider } from './lib/store';
import { AuthProvider, useAuth } from './lib/auth';

// Protected Layout that requires authentication
function ProtectedLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Layout />;
}

// Redirect to app if already authenticated
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/script" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={
        <PublicRoute>
          <Login />
        </PublicRoute>
      } />
      <Route path="/signup" element={
        <PublicRoute>
          <Signup />
        </PublicRoute>
      } />

      {/* Protected routes */}
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<Navigate to="/script" replace />} />
        <Route path="/script" element={<ScriptGenerator />} />
        <Route path="/thumbnail" element={<ThumbnailGenerator />} />
        <Route path="/editor" element={<ImageEditor />} />
        <Route path="/library" element={<Library />} />
      </Route>

      {/* Catch all - redirect to login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <StoreProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </StoreProvider>
    </AuthProvider>
  );
}

export default App;
