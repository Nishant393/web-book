import React from "react";
import { Box, IconButton, MenuItem, Stack, Typography } from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import Button from "../Button";
import { EMPTY_CP } from "./constants";
import { ZohoInput } from "./ZohoFormParts";

function TableHeadText({ children }) {
  return (
    <Typography
      sx={{
        fontSize: 11,
        fontWeight: 600,
        color: "#667085",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
      }}
    >
      {children}
    </Typography>
  );
}

export default function ContactPersonsTab({ rows, onChange }) {
  const addRow = () => onChange([...rows, { ...EMPTY_CP }]);

  const removeRow = (index) =>
    onChange(rows.filter((_, idx) => idx !== index));

  const patchRow = (index, key, value) =>
    onChange(
      rows.map((row, idx) =>
        idx === index ? { ...row, [key]: value } : row
      )
    );

  return (
    <Stack spacing={1.5}>
      <Box sx={{ overflowX: "auto" }}>
        <Box sx={{ minWidth: 880 }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "120px 150px 150px 220px 150px 150px 44px",
              gap: 1,
              px: 1,
              pb: 1,
              borderBottom: "1px solid #e3e7ef",
            }}
          >
            <TableHeadText>Salutation</TableHeadText>
            <TableHeadText>First Name</TableHeadText>
            <TableHeadText>Last Name</TableHeadText>
            <TableHeadText>Email Address</TableHeadText>
            <TableHeadText>Work Phone</TableHeadText>
            <TableHeadText>Mobile</TableHeadText>
            <Box />
          </Box>

          {rows.map((row, index) => (
            <Box
              key={index}
              sx={{
                display: "grid",
                gridTemplateColumns:
                  "120px 150px 150px 220px 150px 150px 44px",
                gap: 1,
                px: 1,
                py: 0.75,
                alignItems: "center",
              }}
            >
              <ZohoInput
                select
                width={120}
                value={row.salutation}
                onChange={(v) => patchRow(index, "salutation", v)}
              >
                {["", "Mr.", "Mrs.", "Ms.", "Dr."].map((item) => (
                  <MenuItem key={item} value={item}>
                    {item || "-"}
                  </MenuItem>
                ))}
              </ZohoInput>

              <ZohoInput
                width={150}
                value={row.firstName}
                onChange={(v) => patchRow(index, "firstName", v)}
              />

              <ZohoInput
                width={150}
                value={row.lastName}
                onChange={(v) => patchRow(index, "lastName", v)}
              />

              <ZohoInput
                width={220}
                value={row.email}
                onChange={(v) => patchRow(index, "email", v)}
              />

              <ZohoInput
                width={150}
                value={row.workPhone}
                onChange={(v) => patchRow(index, "workPhone", v)}
              />

              <ZohoInput
                width={150}
                value={row.mobile}
                onChange={(v) => patchRow(index, "mobile", v)}
              />

              <IconButton size="small" onClick={() => removeRow(index)}>
                <DeleteOutlineRoundedIcon
                  sx={{ fontSize: 16, color: "#ef4444" }}
                />
              </IconButton>
            </Box>
          ))}

          {rows.length === 0 ? (
            <Box sx={{ px: 1, py: 2 }}>
              <Typography sx={{ fontSize: 13, color: "#9ca3af" }}>
                No contact persons added.
              </Typography>
            </Box>
          ) : null}
        </Box>
      </Box>

      <Box>
        <Button
          variant="outline"
          startIcon={<AddRoundedIcon />}
          onClick={addRow}
          sx={{ fontSize: 13 }}
        >
          Add Contact Person
        </Button>
      </Box>
    </Stack>
  );
}