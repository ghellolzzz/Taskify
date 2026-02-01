const express = require('express');
const timeEntryController = require('../controller/timeEntryController');
const { verifyToken } = require('../middleware/jwtMiddleware');

const router = express.Router();

router.post('/', verifyToken, timeEntryController.createTimeEntry);
router.get('/', verifyToken, timeEntryController.getTimeEntries);
router.get('/:id', verifyToken, timeEntryController.getTimeEntryById);
router.put('/:id', verifyToken, timeEntryController.updateTimeEntry);
router.delete('/:id', verifyToken, timeEntryController.deleteTimeEntry);

module.exports = router;
