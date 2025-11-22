const express = require("express");
const router = express.Router();

const commentsController = require("../controller/commentsController");
const { verifyToken } = require("../middleware/jwtMiddleware");

router.use(verifyToken)

router.post("/:taskId",commentsController.create)

router.get("/:taskId",commentsController.retrieve)

router.delete("/delete/:commentId",commentsController.delete)

module.exports=router