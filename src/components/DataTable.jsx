import React from "react";
import PropTypes from "prop-types";
import { Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import AppLoader from "./AppLoader";

export default function DataTable({
  columns,
  rows,
  emptyText = "No data found",
  loading = false,
  loadingText = "Loading...",
  onRowClick,
  minWidth,
  dense = false,
  stickyHeader = false,
}) {
  return (
    <TableContainer
      component={Paper}
      elevation={0}
      sx={{
        borderRadius: "6px",
        overflowX: "auto",
        overflowY: "hidden",
        border: "none",
        bgcolor: "#fff",
        boxShadow: "none",
        width: "100%",
      }}
    >
      <Table size="small" stickyHeader={stickyHeader} sx={{ minWidth: minWidth || "100%", tableLayout: minWidth ? "auto" : "fixed", width: "100%" }}>
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableCell
                key={column.key}
                align={column.align || "left"}
                sx={{
                  width: column.width,
                  maxWidth: column.maxWidth,
                  whiteSpace: "nowrap",
                  bgcolor: "#f7f8fb",
                  color: "#697386",
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.02em",
                }}
              >
                {column.header}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={columns.length} sx={{ py: 3 }}>
                <Box sx={{ py: 2 }}>
                  <AppLoader text={loadingText} fullHeight={160} />
                </Box>
              </TableCell>
            </TableRow>
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} sx={{ py: 3 }}>
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center" }}>
                  {emptyText}
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, rowIndex) => (
              <TableRow
                key={row.__rowKey || row.id || row._id || rowIndex}
                hover
                onClick={() => onRowClick?.(row)}
                sx={{
                  cursor: onRowClick ? "pointer" : "default",
                  bgcolor: row.__active ? "#f2f6ff" : "#fff",
                  "&:hover": { bgcolor: row.__active ? "#edf4ff" : "#fbfcff" },
                  "& td": { py: dense ? 0.75 : 1.15, verticalAlign: "top", fontSize: 13, color: "#111827" },
                }}
              >
                {columns.map((column) => {
                  const value = column.render ? column.render(row, rowIndex) : row[column.key];
                  return (
                    <TableCell
                      key={column.key}
                      align={column.align || "left"}
                      sx={{
                        width: column.width,
                        maxWidth: column.maxWidth,
                        whiteSpace: column.ellipsis ? "nowrap" : "normal",
                        overflow: "hidden",
                        textOverflow: column.ellipsis ? "ellipsis" : "clip",
                        wordBreak: "break-word",
                      }}
                    >
                      {value ?? "-"}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

DataTable.propTypes = {
  columns: PropTypes.array.isRequired,
  rows: PropTypes.array.isRequired,
  emptyText: PropTypes.string,
  loading: PropTypes.bool,
  loadingText: PropTypes.string,
  onRowClick: PropTypes.func,
  minWidth: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  dense: PropTypes.bool,
  stickyHeader: PropTypes.bool,
};
