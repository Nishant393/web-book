// src/api/leads.api.js
import { leadHttp } from "./http";

export const getDashboardStats = async (team = "All", person = "All") => {
  const res = await leadHttp.get("/leads/dashboard-stats", {
    params: { team, person },
  });

  return res.data;
};
