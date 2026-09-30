import { Router } from "express";
import {
  listPoliciesByUser,
  searchPolicies,
} from "../controllers/policy.controller.js";

const router = Router();

router.get("/", listPoliciesByUser);
router.get("/search", searchPolicies);

export default router;
