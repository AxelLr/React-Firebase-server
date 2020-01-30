const isEmpty = (string) => {
    if(string.trim() === '') return true;
    else return false;
}

const validEmail = (email) => {
    const regEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if(email.match(regEx)) return true;
    else return false;
}


exports.validateSignUp = (email, password, confirmPassword, handle) => {

let errors = {};

if(isEmpty(email)) {
errors.email = 'No debe estar vacío'
} else if(!validEmail(email)) {
errors.email = 'Email inválido'
}

if(isEmpty(password)) errors.password = 'No debe estar vacío';

if(password !== confirmPassword) errors.confirmPassword = 'las contraseñas deben coincidir';

if(isEmpty(handle)) errors.handle = 'No debe estar vacío';

return {
    errors,
    valid: Object.keys(errors).length === 0 ? true : false
}

}

exports.validateLogIn = (email, password) => {

    let errors = {};
    
    if(isEmpty(email)) errors.email = 'no debe estar vacío';
    if(isEmpty(password)) errors.password = 'no debe estar vacío';

    return {
        errors,
        valid: Object.keys(errors).length === 0 ? true : false
    }
}


exports.filterUserDetails = (data) => {
    let userDetails = {}

     userDetails.bio = data.bio;

     userDetails.location = data.location;

    return userDetails;
}


