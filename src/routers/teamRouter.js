const express=require('express')
const router= express.Router();
const teamController= require("../controller/teamController")
const { verifyToken } = require("../middleware/jwtMiddleware");

router.post("/", verifyToken, teamController.create)
router.get("/", verifyToken, teamController.getMyTeams)
router.get("/:teamId", verifyToken, teamController.getTeamDetails)
router.post("/:teamId/members", verifyToken, teamController.addMember)
router.get("/:teamId/stats", verifyToken, teamController.getTeamStats)
router.get("/invites/pending", verifyToken, teamController.getPendingInvites);
router.put("/invites/:teamId/respond", verifyToken, teamController.respondToInvite)
router.delete("/:teamId", verifyToken, teamController.deleteTeam);
router.put("/:teamId", verifyToken, teamController.updateTeam);
router.delete("/:teamId/members/:userId", verifyToken, teamController.removeMember);
router.delete("/:teamId/leave", verifyToken, teamController.leaveTeam);
router.get("/:teamId/activity", verifyToken, teamController.getActivity);
router.get("/:teamId/workload", verifyToken, teamController.getWorkload);


module.exports=router