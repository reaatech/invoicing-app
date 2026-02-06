import { HashRouter, Routes, Route } from 'react-router-dom'
import { Box, CssBaseline, ThemeProvider, Typography, createTheme } from '@mui/material'
import { Toaster } from 'react-hot-toast'
import Sidebar from './components/Layout/Sidebar'
import Header from './components/Layout/Header'
import SettingsForm from './components/Settings/SettingsForm'
import CustomerList from './components/Customers/CustomerList'
import CustomerView from './components/Customers/CustomerView'
import ProductList from './components/Products/ProductList'
import ProductView from './components/Products/ProductView'
import InvoiceList from './components/Invoices/InvoiceList'
import InvoiceView from './components/Invoices/InvoiceView'
import Home from './components/Home'
import './App.css'
import appLogo from './assets/react.svg'
import { useState, useEffect } from 'react'

function App() {
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const savedTheme = localStorage.getItem('darkMode');
    if (savedTheme) {
      setDarkMode(JSON.parse(savedTheme));
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkMode(prefersDark);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  const muiTheme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: {
        main: '#2563eb'
      },
      background: {
        default: darkMode ? '#0f172a' : '#f8fafc',
        paper: darkMode ? '#111827' : '#ffffff'
      }
    },
    shape: {
      borderRadius: 12
    },
    typography: {
      fontFamily: '"Source Sans 3", "Inter", "Helvetica", "Arial", sans-serif'
    },
    components: {
      MuiPaper: {
        defaultProps: {
          elevation: 0
        },
        styleOverrides: {
          root: {
            border: '1px solid',
            borderColor: darkMode ? 'rgba(148, 163, 184, 0.2)' : 'rgba(148, 163, 184, 0.3)',
            transition: 'box-shadow 180ms ease, transform 180ms ease',
            '&:hover': {
              boxShadow: darkMode
                ? '0 10px 25px rgba(15, 23, 42, 0.35)'
                : '0 10px 24px rgba(15, 23, 42, 0.12)',
              transform: 'translateY(-1px)'
            }
          }
        }
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: 10
          }
        }
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: 'none'
          }
        }
      }
    }
  });

  if (showSplash) {
    return (
      <ThemeProvider theme={muiTheme}>
        <CssBaseline />
        <Box className="app-splash" bgcolor="background.default" color="text.primary">
          <Box className="app-splash-card">
            <img src={appLogo} alt="Invoicing App" className="app-splash-logo" />
            <Typography variant="h6" fontWeight={700}>Invoicing App</Typography>
          </Box>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <HashRouter>
        <Box display="flex" minHeight="100vh" bgcolor="background.default" color="text.primary">
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'var(--toast-bg)',
                color: 'var(--toast-color)',
              },
              className: 'dark:bg-gray-800 dark:text-white',
              success: {
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
          <Sidebar />
          <Box display="flex" flexDirection="column" flex={1} minWidth={0}>
            <Header darkMode={darkMode} onToggleDarkMode={() => setDarkMode(prev => !prev)} />
            <Box component="main" flex={1} overflow="auto" p={3} bgcolor="background.default">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/settings" element={<SettingsForm />} />
                <Route path="/customers" element={<CustomerList />} />
                <Route path="/customers/:id" element={<CustomerView />} />
                <Route path="/products" element={<ProductList />} />
                <Route path="/products/:id" element={<ProductView />} />
                <Route path="/invoices" element={<InvoiceList />} />
                <Route path="/invoices/:id" element={<InvoiceView />} />
              </Routes>
            </Box>
          </Box>
        </Box>
      </HashRouter>
    </ThemeProvider>
  )
}

export default App
