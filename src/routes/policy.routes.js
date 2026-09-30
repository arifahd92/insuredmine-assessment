import { Router } from "express";
import { searchPolicies } from "../controllers/policy.controller.js";

const router = Router();

router.get("/search", searchPolicies);

export default router;
