const { db, admin } = require('../firebaseAdmin');
const config = require('../firebaseConfig');

const firebase = require('firebase');
firebase.initializeApp(config);

const { validateSignUp, validateLogIn, filterUserDetails } = require('../validators');


exports.signUp =  ( req, res ) => {
   
    // NEW USER
    let { email , password, confirmPassword, handle } = req.body;

    const { valid, errors } = validateSignUp(email, password, confirmPassword, handle);
    
    if(!valid) return res.status(400).json(errors);

    let token, userId;

    let noProfileImg = 'noprofileimg2.png'
 // SIGN UP ROUTE 
db.doc(`/users/${handle}`).get() // new user document
    .then(doc =>{
        if(doc.exists){
            return res.status(400).json({handle: 'Este nombre ya existe, intenta otro'})
        } else {
            return firebase.auth().createUserWithEmailAndPassword(email, password);
        }
    })
    .then(data => {
        userId = data.user.uid;
        return data.user.getIdToken();
    })
    .then(tokenId =>{
     token = tokenId;
    const userCredentials = {
        email,
        handle,
        createdAt: new Date().toISOString(),
        imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noProfileImg}?alt=media`, 
        userId
    }
    return db.doc(`/users/${handle}`).set(userCredentials);
    })
    .then( () => {
        res.status(201).json({ token });
    })
    .catch(err =>{
        console.error(err);
        return res.status(500).json({general: 'something went wrong. Please, try again'}) 
    })    
}


exports.logIn = (req, res) => {

    let {email, password} = req.body;
    
    const { valid, errors } = validateLogIn(email, password);
    
    if(!valid) return res.status(400).json(errors);

    firebase.auth().signInWithEmailAndPassword(email , password)
     .then(data => {
       return data.user.getIdToken();
     })
     .then(token => {
         return  res.json({token})
     })
     .catch(err => {
         console.log(err)
         return res.status(403).json({general: 'credenciales incorrectas, intenta de nuevo'});
     })
}

exports.uploadImage = (req, res) => {
    const BusBoy = require('busboy');
    const path = require('path');
    const os = require('os');
    const fs = require('fs');
  
    const busboy = new BusBoy({ headers: req.headers });
  
    let imageToBeUploaded = {};
    let imageFileName;
  
    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
      console.log(fieldname, file, filename, encoding, mimetype);
      if (mimetype !== 'image/jpeg' && mimetype !== 'image/png') {
        return res.status(400).json({ error: 'Wrong file type submitted' });
      }
    
      const imageExtension = filename.split('.')[filename.split('.').length - 1];
    
      imageFileName = `${Math.round(
        Math.random() * 1000000000000
      ).toString()}.${imageExtension}`;
      const filepath = path.join(os.tmpdir(), imageFileName);
      imageToBeUploaded = { filepath, mimetype };
      file.pipe(fs.createWriteStream(filepath));
    });
    busboy.on('finish', () => {
      admin
        .storage()
        .bucket(config.storageBucket)
        .upload(imageToBeUploaded.filepath, {
          resumable: false,
          metadata: {
            metadata: {
              contentType: imageToBeUploaded.mimetype
            }
          }
        })
        .then(() => {
          const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${
            config.storageBucket          }/o/${imageFileName}?alt=media`;
          return db.doc(`/users/${req.user.handle}`).update({ imageUrl });
        })
        .then(() => {
          return res.json({ message: 'image uploaded successfully' });
        })
        .catch((err) => {
          console.error(err);
          return res.status(500).json({ error: 'something went wrong' });
        });
    });
    busboy.end(req.rawBody);
  };


  exports.addUserDetails = (req, res) => {

    let userDetails = filterUserDetails(req.body); 

    db.doc(`/users/${req.user.handle}`).update(userDetails)
      .then( () => {
        return res.status(200).json({message: 'Listo!'})
      } )
      .catch(err => {
        console.error(err);
        return res.status(500).json({error: err.code})
      })
  }


  exports.getAuthUserData = (req, res) => {
    let userData = {};

    db.doc(`/users/${req.user.handle}`).get()
      .then(doc => {
        if(doc.exists) {
        userData.credentials = doc.data();
        return db.collection('/likes').where('userHandle', '==', req.user.handle).get()
       }
    })
      .then(data => {
        userData.likes = [];
        data.forEach(doc => {
          userData.likes.push(doc.data());
        });

      return db.collection('notifications').where("receiver","==", req.user.handle)
        .orderBy('createdAt', 'desc')
        .limit(8).get();
      })
      .then(data => {
        userData.notifications = [];
        data.forEach(doc => {
          userData.notifications.push({
            notificationId: doc.id,
            ...doc.data()
          })
        });  return res.json(userData);
       })     
      .catch(err => {
        console.error(err)
        return res.status(500).json({error: err.code});
      })
  }


  exports.getUserData = (req, res) => {

    let userData = {};

    db.collection('users').doc(`/${req.params.handle}`).get()
      .then(doc => {
        if(doc.exists) {
          userData.user = {
            ...doc.data()
          }
          return db.collection('posts').where('userHandle', "==", req.params.handle)
                  .orderBy('createdAt', "desc")
                  .get()
        } else {
          res.status(404).json({error: 'user not found'})
        }
      })
      .then(doc => {
        userData.posts = [];
        doc.forEach(doc => {
          userData.posts.push({
            postId : doc.id,
            ...doc.data()
          })
        });
        return res.json(userData);
      })
      .catch(err => {
        console.error(err);
        res.status(500).json({error: err.code})
      })

  }


  exports.readedNotification = (req, res) => {

    let batch = db.batch();

    req.body.forEach(notificationId => {
      let notification = db.collection('notifications').doc(`${notificationId}`);
      batch.update(notification, {read: true});
    })
    batch.commit()
      .then( () => {
        return res.json({message: 'notificacion leida'})
      })

      .catch(err => {
        console.error(error);
        return res.status(500).json({error: err.code})
      })


  }