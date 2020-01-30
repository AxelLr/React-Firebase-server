const { db } = require('../firebaseAdmin');

exports.getAllPosts = (req, res) => {
    db
    .collection('posts')
    .orderBy('createdAt', 'desc')
    .get()
    .then((data) => {
        let posts = [];
    data.forEach(doc => { posts.push({
        postId: doc.id, ...doc.data()
    });
     })
     return res.json(posts);
    })
    .catch(err => console.error(err));
}

// get one post
exports.getPost = (req, res) => {
    let postData = {};
    db.doc(`/posts/${req.params.postid}`)
      .get()
      .then((doc) => {
        if (!doc.exists) {
            return res.status(404).json({ error: 'Post not found' });
          }
        postData = doc.data();
        postData.postId = doc.id;
        return db
        .collection('comments')
        .orderBy('createdAt', 'desc')
        .where('postId', '==', req.params.postid)
        .get();        
  })
  .then((data) => {
    postData.comments = [];
    data.forEach((doc) => {
      postData.comments.push(doc.data());
    });
    return res.json(postData);
})
.catch((err) => {
    console.error(err);
    res.status(500).json({ error: err.code });
  });
}


exports.newPost = (req, res ) => {

    if (req.body.content.trim() === '') {
        return res.status(400).json({ general: 'No debe estar vacío' });
      }
    
    let newPost = {
        userImage: req.user.imageUrl,
        content: req.body.content,
        userHandle: req.user.handle,
        createdAt: new Date().toISOString(),
        likeCount: 0,
        commentCount: 0
    };
    
        db
        .collection('posts')
        .add(newPost)
        .then (doc => {
            let postRes = newPost;
            postRes.postId = doc.id;
          return  res.json(postRes);
        })
    
        .catch(err => { res.status(500).json({error: 'something went wrong'});
                console.log(err);
            });
    }


    exports.newComment = (req, res) => {
    
    if(req.body.content.trim() === '') return res.status(400).json({comment: 'no debe estar vacío'})

    const newComment = {
        content: req.body.content,
        createdAt: new Date().toISOString(),
        postId: req.params.postid,
        userHandle: req.user.handle,
        userImage: req.user.imageUrl
    }

    db.doc(`/posts/${req.params.postid}`).get()
        .then(doc => {
            if(!doc.exists) { return res.status(400).json({error: 'post does not exists'}) }
            return doc.ref.update({ commentCount: doc.data().commentCount + 1 });
        })
         .then( () => {
            return db.collection('comments').add(newComment);
        })
        .then( () => {
            return res.json(newComment)
        })
        .catch(err => { 
            console.log(err);
            res.status(500).json({error: 'no debe estar vacío'});
            });

    }


    exports.likeAPost = (req, res) => {

        const likeDocument = db.collection('likes').where("userHandle", "==", req.user.handle)
                            .where("postId","==",req.params.postid);

        const postDocument = db.collection('posts').doc(`${req.params.postid}`);

        let postData;

        postDocument.get()
            .then(doc => {
                if(doc.exists) {
                    postData = doc.data();
                    postData.id = doc.id;
                    return likeDocument.get();
                } else {
                    return res.status(400).json({error: 'post not found'})
                }
            })
            .then( data => {
             if(data.empty) {
                 db.collection('likes').add({
                 postId: postData.id,
                 userHandle: req.user.handle
                 })
                 .then(() => {
                   postData.likeCount++
                   return postDocument.update({likeCount: postData.likeCount})
                 })
                 .then(() => {
                     return res.json(postData);
                 })
             } else {
                 return res.status(400).json({error: 'post already liked'})
             }
            })
            .catch(err => {
                console.error(err);
                res.status(500).json({error: err.code});
            })
    }
    

    exports.deleteLike = (req, res) => {
        
        const likeDocument = db.collection('likes').where("userHandle", "==", req.user.handle)
                            .where("postId","==",req.params.postid);

         const postDocument = db.collection('posts').doc(`${req.params.postid}`);

        let postData;

        postDocument.get()
            .then(doc => {
                if(doc.exists) {
                    postData = doc.data();
                    postData.id = doc.id;
                    return likeDocument.get();
                } else {
                    return res.status(400).json({error: 'post not found'})
                }
            })
            .then( data => {
             if(data.empty) {
             return res.status(400).json({error: 'post already liked'})   
             } else {
                db.doc(`/likes/${data.docs[0].id}`).delete()
                .then(() => {
                  postData.likeCount--
                  return postDocument.update({likeCount: postData.likeCount})
                })
                .then(() => {
                    return res.json(postData);
                }) 
             }
            })
            .catch(err => {
                console.error(err);
                res.status(500).json({error: err.code});
            })
    }


    exports.deletePost = (req, res) => {

        let postDocument = db.collection("/posts").doc(`${req.params.postid}`);

        postDocument.get()
            .then(doc => {
                if(!doc.exists) {
                    return res.status(400).json({error: 'post not found'}) }
                if(req.user.handle !== doc.data().userHandle) {
                    return res.status(403).json({message: 'you cant delete this post'})
                } else {
                    postDocument.delete();
                    return res.status(200).json({message: 'post succesfully deleted'})
                }
            })
            .catch(err => {
                console.error(err);
                return res.status(500).json({error: err.code + 'something went wrong'})
            })
    }