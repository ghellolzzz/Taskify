//////////////////////////////////////////////////////
// REQUIRE MODULES
//////////////////////////////////////////////////////

const model = require('../models/User.model');

//////////////////////////////////////////////////////
// CONTROLLER FOR LOGIN
//////////////////////////////////////////////////////

module.exports.login = (req, res, next) => {
    if (req.body.email == undefined || req.body.password == undefined) {
        res.status(400).send("Error: email or password is undefined");
        return;
    }

    const data = {
        email: req.body.email
    };

    const callback = (error, results) => {
        if (error) {
            console.error("Error login", error);
            res.status(500).json(error);
        } else {
            if (results.length == 0) {
                res.status(404).json({message: "User not found"})
            }
            else {
                res.locals.email = results[0].email;
                res.locals.name = results[0].name;
                res.locals.hash = results[0].password;
                res.locals.userId = results[0].id;
                res.locals.message = 'Login successful';

                // Generate token after successful login
                next(); // This will trigger the `comparePassword` middleware, then `generateToken`
            }
        }
    };

    model.selectByEmail(data, callback);
};

//////////////////////////////////////////////////////
// CONTROLLER FOR REGISTER
//////////////////////////////////////////////////////

module.exports.register = (req, res, next) => {
    if (req.body.name == undefined || req.body.email == undefined || req.body.password == undefined) {
        res.status(400).send("Error: name / email / password is undefined");
        return;
    }

    const data = {
        name: req.body.name,
        email: req.body.email,
        password: res.locals.hash
    }

    const callback = (error, results) => {
        if (error) {
            console.error("Error register", error);
            // Check if it's a unique constraint violation (duplicate email)
            if (error.code === 'P2002' || error.meta?.target?.includes('email')) {
                res.status(409).json({message: "Email already exists"});
            } else {
                res.status(500).json({error: error.message || "Internal server error"});
            }
        } else {
            if (!results || results.length === 0) {
                res.status(500).json({error: "Failed to create user"});
            } else {
                res.locals.userId = results[0].id;
                res.locals.name = results[0].name;
                res.locals.email = results[0].email;
                res.locals.message = `User ${data.name} created successfully.`
                next();
            }
        }
    }

    model.addUser(data, callback);
}

//////////////////////////////////////////////////////
// MIDDLEWARE FOR CHECK IF EMAIL EXISTS
//////////////////////////////////////////////////////

module.exports.checkEmailExist = (req, res, next) => {
    const data = {
        email: req.body.email
    }

    const callback = (error, exists) => {
        if (error) {
            console.error("Error checkEmailExist:", error);
            res.status(500).json({error: error.message || "Internal server error"});
        } else {
            if (exists) {
                res.status(409).json({message: "Email already exists"});
            }
            else {
                next();
            }
        }
    }

    model.checkEmailExists(data, callback);
}
