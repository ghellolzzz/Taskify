const express=require('express')
const router= express.Router();

const goalController=require("../controller/goalController")
const { verifyToken } = require("../middleware/jwtMiddleware");



router.post("/", verifyToken, goalController.create);
router.get("/", verifyToken, goalController.retrieveAll);
router.get("/:id", verifyToken, goalController.retrieveById);
router.put("/:id", verifyToken, goalController.updateGoal);
router.delete("/:id", verifyToken, goalController.delete);
router.get("/stats/progress", verifyToken, goalController.progress);

module.exports = router;