const express=require('express')
const router= express.Router();
const teamController= require("../controller/teamController")
const { verifyToken } = require("../middleware/jwtMiddleware");

router.post("/", verifyToken, teamController.create)
router.get("/", verifyToken, teamController.getMyTeams)
router.get("/:teamId", verifyToken, teamController.getTeamDetails)
router.post("/:teamId/members", verifyToken, teamController.addMember)
router.get("/:teamId/stats", verifyToken, teamController.getTeamStats)


module.exports=router