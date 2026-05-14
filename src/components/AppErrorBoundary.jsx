// src/components/AppErrorBoundary.jsx
import React from "react";
import { Box, Paper, Typography, Button, Stack, Container } from "@mui/material";
import { HistoricalUiStyles, powerTokens } from "../styles/powerUi";

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  // ✅ FIX: correct lifecycle name
  componentDidCatch(error, info) {
    this.setState({ info });
    console.error("[AppErrorBoundary]", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    // ✅ ONLY 2 TEXT TYPES (sync with your other pages)
    const T_TITLE = {
      fontWeight: 1100,
      fontSize: 14,
      lineHeight: 1.25,
      color: "rgba(15,23,42,0.92)",
    };

    const T_SUB = {
      fontWeight: 900,
      fontSize: 12,
      lineHeight: 1.25,
      color: "rgba(15,23,42,0.65)",
    };

    return (
      <>
        <HistoricalUiStyles />
        <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          p: { xs: 2, sm: 4, md: 6 },
          bgcolor: powerTokens.colors.pageBg,
        }}
      >
        <Container maxWidth="sm">
          <Paper
            sx={{
              p: { xs: 2.5, sm: 4 },
              borderRadius: "10px",
              border: `1px solid ${powerTokens.colors.border}`,
              boxShadow: powerTokens.shadow.dialog,
            }}
          >
            <Typography sx={T_TITLE}>
              UI crashed (caught by ErrorBoundary)
            </Typography>

            <Typography sx={{ ...T_SUB, mt: 1 }}>
              The real error is shown below:
            </Typography>

            <Paper
              sx={{
                mt: 3,
                p: 2,
                borderRadius: 2,
                bgcolor: "rgba(15,23,42,0.04)",
                border: "1px solid rgba(15,23,42,0.10)",
                whiteSpace: "pre-wrap",
                overflow: "auto",
                maxHeight: 300,
              }}
            >
              <Typography
                sx={{
                  ...T_SUB,
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                  fontWeight: 900,
                  wordBreak: "break-word",
                }}
              >
                {String(this.state.error?.message || this.state.error || "Unknown error")}
              </Typography>
            </Paper>

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.5}
              sx={{ mt: 3 }}
            >
              <Button
                variant="contained"
                size="large"
                onClick={() => window.location.reload()}
                sx={{
                  textTransform: "none",
                  fontWeight: 900,
                  px: 4,
                  borderRadius: 2,
                }}
              >
                Reload
              </Button>

              <Button
                variant="outlined"
                size="large"
                onClick={() => this.setState({ hasError: false, error: null, info: null })}
                sx={{
                  textTransform: "none",
                  fontWeight: 900,
                  px: 4,
                  borderRadius: 2,
                  borderColor: "rgba(15,23,42,0.18)",
                  color: "rgba(15,23,42,0.8)",
                }}
              >
                Try again
              </Button>
            </Stack>
          </Paper>
        </Container>
        </Box>
      </>
    );
  }
}
