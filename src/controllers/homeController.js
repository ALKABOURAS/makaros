exports.getHome = (req, res) => {
    // Προσομοίωση δεδομένων από τη βάση
    const user = req.session.user;

    // Αν ο χρήστης δεν έχει avatar_path (null), βάλε το default
    const displayAvatar = user.avatar_path || '/img/default-avatar.png';

    const enrolledCourses = [
        { id: 1, title: "Σύγχρονα Οικονομικά", progress: "95/100 Ασκήσεις", icon: "btc-icon.png" },
        { id: 2, title: "Οικονομική Θεωρία", progress: "95/100 Ασκήσεις", icon: "theory-icon.png" }
    ];

    res.render('home', {
        layout: 'dashboardLayout', // Ορίζουμε ρητά το νέο layout
        title: 'Αρχική - Dashboard',
        user: user,
        avatar: displayAvatar,
        courses: enrolledCourses
    });
};