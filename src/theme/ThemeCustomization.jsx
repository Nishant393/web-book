import React from "react";
import PropTypes from "prop-types";
import { createTheme, ThemeProvider, StyledEngineProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      light: "#63B3FF",
      main: "#168BFF",
      dark: "#0B6FD3",
      contrastText: "#ffffff",
    },
    secondary: {
      light: "#B39DDB",
      main: "#673AB7",
      dark: "#4527A0",
      contrastText: "#ffffff",
    },
    success: {
      main: "#059669",
    },
    warning: {
      main: "#D97706",
    },
    error: {
      main: "#DC2626",
    },
    background: {
      default: "#EEF3F8",
      paper: "#FFFFFF",
    },
    text: {
      primary: "#0B1220",
      secondary: "#64748B",
      disabled: "#94A3B8",
    },
    divider: "#DDE7F1",
  },
  shape: {
    borderRadius: 10,
  },
  typography: {
    fontFamily: '"Roboto", sans-serif',
    h4: { fontWeight: 600, letterSpacing: "-0.025em" },
    h5: { fontWeight: 600, letterSpacing: "-0.02em" },
    h6: { fontWeight: 600, letterSpacing: "-0.01em" },
    button: { textTransform: "none", fontWeight: 600 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: "#EEF3F8",
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
          textRendering: "geometricPrecision",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          boxShadow: "none",
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          backgroundColor: "#FFFFFF",
        },
      },
    },
  },
});

export default function ThemeCustomization({ children }) {
  return (
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={theme}>
        <CssBaseline enableColorScheme />
        {children}
      </ThemeProvider>
    </StyledEngineProvider>
  );
}

ThemeCustomization.propTypes = {
  children: PropTypes.node,
};
