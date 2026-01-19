const express=require('express')
const router= express.Router();

const taskController= require("../controller/taskController")
const { verifyToken } = require("../middleware/jwtMiddleware");

router.post('/', verifyToken, taskController.create);
router.get('/', verifyToken, taskController.retrieveAll);

router.get('/filter', verifyToken, taskController.filter);  

router.get('/:id', verifyToken, taskController.retrieveById);
router.put('/:id', verifyToken, taskController.update);
router.delete('/:id', verifyToken, taskController.delete);


module.exports=router