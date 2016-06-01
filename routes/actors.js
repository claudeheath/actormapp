var express = require('express');
var router = express.Router();
var ObjectId = require('mongodb').ObjectID;
var database = require('../database');
// custom library
//var config = require('../support/config');
var multer = require('multer');
var upload = multer({ dest: 'uploads/' });
var sizeOf = require('image-size');
require('string.prototype.startswith');

/* GET /actors listing */
router.get('/', function(req, res, next) {
	// Set our internal DB variable
    var db = req.db;
    // Set our collection
    var collection = db.get('actors');

    collection.find({}, function (err, docs){
		res.render('actorshome', {title: 'Actor Mapping - Actors', actors: docs});
	});		
});

/* GET /actors/add */
router.get('/add', function(req, res, next) {
 res.render('actors', {title: 'Actor Mapping - Add an Actor'});
});

/* POST /actors/add */
router.post('/add', function(req, res, next) {
	console.log('Add an Actor:');
	console.log(req.body);

    // Set our internal DB variable
    var db = req.db;

    // Take the parameters into a JSON object
	var Actor = {'name' : req.body.name};

	if (Array.isArray(req.body.label)) {
		//
		for(var index in req.body.label) {
			Actor[req.body.label[index]] = req.body.value[index];
		};
	} else {
		Actor[req.body.label] = req.body.value;
	};

	//for(var index in req.body.label) {
	//	Actor[req.body.label[index]] = req.body.value[index];
	//};

	console.log('JSON - Actor : ' + JSON.stringify(Actor));

    // Set our collection
    var collection = db.get('actors');

    // Submit to the DB
    collection.insert(Actor, function (err, doc) {
        if (err) {
            // If it failed, return error
            res.send("There was a problem adding the information to the database.");
        }
        else {
            // And forward to success page
            res.redirect("/actors");
        }
    });
});

/* GET /actors/id */
router.get('/:id', function(req, res, next) {
	console.log('Get the details of an Actor:' + req.params.id);
	console.log(req.body);

    // Set our internal DB variable
    var db = req.db;

    // Set our collection
    var collection = db.get('actors');

	collection.findById(req.params.id, function (err, post) {
		if (err) return next(err);
		collection.find({}, function (err, actors){
			if (err) return next(err);
			var actorDropDown = "<select name='actorTarget[]'>";
			actors.forEach(function(actordetail) {
		 		actorDropDown = actorDropDown + "<option value='" + actordetail._id + "'>" + actordetail.name + "</option>"  
		 	});
		 	actorDropDown = actorDropDown + "</select>";
		 	console.log('THE Actor : ' + post);
			res.render('actordetails', {title: 'Actor Mapping - Actors', actor: post, actordropdown: actorDropDown});
		});
	});
});

/* POST /upload Handle uploading images for an actor */
router.post('/upload', upload.single( 'file' ), function(req, res, next) {
	console.log('Upload an image');
	console.log('Actor ID: ' + req.body.actor_id);
	if ( !req.file.mimetype.startsWith( 'image/' ) ) {
	    return res.status( 422 ).json( {
	      error : 'The uploaded file must be an image'
	    } );
	}

	var dimensions = sizeOf( req.file.path );

	if ( ( dimensions.width < 640 ) || ( dimensions.height < 480 ) ) {
	    return res.status( 422 ).json( {
	      error : 'The image must be at least 640 x 480px'
	    } );
	}

	console.log('Image Details: ' + JSON.stringify(req.file) );
	return res.status( 200 ).send( req.file );
});

/* PUT /actors/id */
router.post('/:id', function(req, res, next) {
	console.log('Update the Actor : ' + req.params.id);
	console.log(req.body);

	var Actor = {};
	// Rebuild the Actor object
	for(var parameterName in req.body) {
		if(parameterName != 'label' && parameterName != 'value' && parameterName != 'relTarget' && parameterName != 'actorTarget') {
			console.log('NAME: ' + parameterName + ' : ' + req.body[parameterName]);
			if(parameterName != '_method' && parameterName != 'submit'){
				Actor[parameterName] = req.body[parameterName];
			}
		} else {
			if(parameterName != 'relTarget' && parameterName != 'actorTarget') {
			if (Array.isArray(req.body.label)) {
				for(var index in req.body.label) {
					Actor[req.body.label[index]] = req.body.value[index];
				};
			} else {
				Actor[req.body.label] = req.body.value;
			};
			} else {
				if(req.body.relTarget.slice(-1).pop() != '') {
					// Then write 
					// Write in the relTarget & actorTarget values
					Actor['relTarget'] = req.body.relTarget;
					Actor['actorTarget'] = req.body.actorTarget;
				} else {
					lastTarget = req.body.relTarget.pop();
					lastActor = req.body.actorTarget.pop();
					Actor['relTarget'] = req.body.relTarget;
					Actor['actorTarget'] = req.body.actorTarget;
				}
			};
		};

	};

	console.log(Actor);
    // Set our internal DB variable
    var db = req.db;

    // Set our collection
    var collection = db.get('actors');

    collection.update({_id: req.params.id},Actor);

    res.redirect('/actors/' + req.params.id);
});

/* GET /actors/delete/id */
router.get('/delete/:id', function(req, res, next) {
	console.log('Delete the Actor : ' + req.params.id);

	var id = req.params.id;
	console.log('ID: ' + id);
	// Set our internal DB variable
    var db = req.db;
    // Set our collection
    var collection = db.get('actors');

    console.log(collection);

    collection.remove({ "_id": req.params.id }, function (err, result){
    	if(err){
    		console.log(err);
    	} else {
    		 res.redirect('/actors');
    	}
	});
   
});

/* GET /actors/remove/id?key=value */
router.get('/remove/:id/:key', function(req, res, next) {
	console.log('Remove Parameter from Actor: ' + req.params.id);
	console.log(req.params);
	console.log(req.body);
	var key1 = req.params.key
	var key = {};
	key[key1] = 1
	// Set our internal DB variable
    var db = req.db;
    // Set our collection
    var collection = db.get('actors');
    console.log("Key: " + key);
    collection.update({"_id": req.params.id}, { $unset: key }, {w:1}, function (err, result){
    	if(err){
    		console.log(err);
    	} else {
    		console.log("Result: " + result);
    		res.redirect('/actors/' + req.params.id);
    	}
    });	
	
});


module.exports = router;