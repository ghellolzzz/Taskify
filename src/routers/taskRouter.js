const express=require('express')
const router= express.Router();

const taskController= require("../controller/taskController")


router.post('/', taskController.create);
router.get('/', taskController.retrieveAll);
router.get('/:id', taskController.retrieveById);
router.put('/:id', taskController.update);
router.delete('/:id', taskController.delete);

module.exports=router