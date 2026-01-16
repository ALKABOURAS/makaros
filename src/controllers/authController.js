exports.getLogin = (req, res) => {
    res.render('login', {
        title: 'Είσοδος',
        style: 'login.css' // Δυναμικό CSS
    });
};

exports.getSignup = (req, res) => {
    res.render('signup', {
        title: 'Εγγραφή',
        style: 'signup.css'
    });
};

exports.postLogin = (req, res) => {
    // Μελλοντικά: Έλεγχος password, Sessions/Cookies
    res.send('Login Logic Processing...');
};

exports.postSignup = (req, res) => {
    // Μελλοντικά: Αποθήκευση χρήστη στη βάση δεδομένων
    res.send('Signup Logic Processing...');
};