/**
 * UTC | Umali Tours Corporation
 * Main Application Logic (Vanilla JS, LocalStorage CRUD)
 */
const UTCApp = {
    state: {
        currentUser: JSON.parse(localStorage.getItem('utc_user')) || null,
        users: JSON.parse(localStorage.getItem('utc_users')) || [],
        bookings: JSON.parse(localStorage.getItem('utc_bookings')) || null
    },

    async refreshBookings() {
        this.state.bookings = [];

        let tripsRes = await fetch("https://dashboard.baligad.net/api/v1/trips", { credentials: "include" });
        let tripsJson = await tripsRes.json();
        console.log(tripsJson)

        for (let i = 0; i < tripsJson.length; i++) {
            const trip = tripsJson[i];

            let pushJson = {
                id: "UTC-" + trip.id.toString().padStart(5, "0"),
                userId: this.state.currentUser.email,
                passengers: trip.passenger_count,
                notes: trip.note
            }

            switch (trip.status) {
                case "CREATED":
                    pushJson["status"] = "Created"
                    break;
                case "NEGOTIATING":
                    pushJson["status"] = "Under Negotiation"
                    break;
                case "ACTIVE":
                case "CONFIRMED":
                    pushJson["status"] = "Confirmed"
                    break;
                case "COMPLETED":
                    pushJson["status"] = "Completed"
                    break;
                case "CANCELLED":
                    pushJson["status"] = "Cancelled"
                    break;
            }

            pushJson["pickupDate"] = trip.start_at.split("T")[0] ?? "";
            pushJson["pickupTime"] = trip.start_at.split("T")[1] ?? "";
            pushJson["timestamp"] = new Date(parseInt(trip.created_at));

            if (trip.booking_type == "TRANSPORTATION") {
                pushJson["category"] = "Tourist Transportation";
                switch (trip.service_type) {
                    case "AIRPORT TRANSFER":
                        pushJson["serviceType"] = "Airport Transfer (Kalibo ↔ Caticlan)";
                        break;
                    case "P2P TRANSFER":
                        pushJson["serviceType"] = "Point-to-Point Transfer";
                        break;
                    case "PANAY ISLAND TOUR":
                        pushJson["serviceType"] = "Panay Island Tour";
                        break;
                    case "TAXI SERVICE":
                        pushJson["serviceType"] = "Taxi Service";
                        break;
                }

                switch (trip.service_subtype) {
                    case "ONE WAY":
                        pushJson["tripType"] = "One-Way"
                        break;
                    case "ROUND TRIP":
                        pushJson["tripType"] = "Round-Trip"
                        break;
                }

                pushJson["touristPickupLocation"] = trip.start_location ?? "";
                pushJson["touristDropoffLocation"] = trip.end_location ?? "";
            } else {
                pushJson["category"] = "Vehicle Rentals";
                switch (trip.service_type) {
                    case "VAN RENTAL":
                        pushJson["serviceType"] = "Van Rental (with Driver)";
                        break;
                    case "PRIVATE CAR":
                        pushJson["serviceType"] = "Private Car / Sedan Rental";
                        break;
                    case "BRIDAL CAR":
                        pushJson["serviceType"] = "Bridal Car Service";
                        break;
                    case "WHITE TAXI CHARTER":
                        pushJson["serviceType"] = "White Taxi Charter";
                        break;
                }

                switch (trip.service_subtype) {
                    case "HALF DAY":
                        pushJson["duration"] = "Half Day (4 hrs)"
                        break;
                    case "FULL DAY":
                        pushJson["duration"] = "Full Day (8-12 hrs)"
                        break;
                    case "MULTI DAY":
                        pushJson["duration"] = "Multi-Day Rental"
                        break;
                }

                pushJson["rentalPickupLocation"] = trip.start_location ?? "";
                pushJson["rentalRoute"] = trip.end_location ?? "";
            }

            this.state.bookings.push(pushJson)
            //  {
            //         id: 'UTC-2026-0001',
            //         userId: 'test@umalitours.com',
            //         category: 'Tourist Transportation',
            //         serviceType: 'Airport Transfer (Kalibo ↔ Caticlan)',
            //         tripType: 'One-Way',
            //         touristPickupLocation: 'Kalibo International Airport',
            //         touristDropoffLocation: 'Caticlan Jetty Port',
            //         pickupDate: '2026-10-15',
            //         pickupTime: '14:00',
            //         passengers: 2,
            //         notes: 'Flight ETA 13:30',
            //         status: 'Completed',
            //         timestamp: new Date(Date.now() - 864000000).toISOString()
            //     },
            // {
            //         id: 'UTC-2026-0002',
            //         userId: 'test@umalitours.com',
            //         category: 'Vehicle Rentals',
            //         serviceType: 'Van Rental (with Driver)',
            //         duration: 'Full Day (8-12 hrs)',
            //         pickupDate: '2026-10-20',
            //         pickupTime: '08:00',
            //         rentalPickupLocation: 'Boracay Hotel',
            //         rentalRoute: 'Panay Island Tour',
            //         passengers: 6,
            //         notes: 'Please provide child seat.',
            //         status: 'Currently Happening',
            //         timestamp: new Date(Date.now() - 86400000).toISOString()
            //     },
        }

        this.renderBookings()
    },

    async init() {
        // this.seedData();

        let res = await fetch("https://dashboard.baligad.net/api/v1/sessions", { credentials: "include" })

        if (res.status == 200) {
            let accountMini = await res.json();
            console.log(accountMini)

            let accountRes = await fetch(`https://dashboard.baligad.net/api/v1/accounts/${accountMini.id}`, { credentials: "include" });

            if (accountRes.status != 200) {
                console.log(accountRes.status)
                return this.showToast('An unknown error occurred', 'error')
            }

            let account = await accountRes.json();
            console.log(account)

            this.state.currentUser = {
                first_name: account.account_details.first_name,
                middle_name: account.account_details.middle_name,
                last_name: account.account_details.last_name,
                email: account.username,
                phone: account.account_details.mobile_number
            }

            localStorage.setItem("accountID", account.id)

            // get trips
            this.refreshBookings()
        } else {
            localStorage.removeItem("accountID")
        }

        this.renderAuthHeader();
        
        // Handle URL Hash Navigation
        const hash = window.location.hash.replace('#', '');
        if (hash) {
            this.navigate(hash);
        } else {
            this.navigate('home');
        }

        this.setBookingCategory('Tourist Transportation')
    },

    seedData() {
        // Clear old demo data
        if (this.state.users.some(u => u.email === 'demo@example.com')) {
            this.state.users = this.state.users.filter(u => u.email !== 'demo@example.com');
            localStorage.setItem('utc_users', JSON.stringify(this.state.users));
        }

        // Guarantee test@umalitours.com exists
        // if (!this.state.users.some(u => u.email === 'test@umalitours.com')) {
        //     this.state.users.push({
        //         name: 'Test Client',
        //         email: 'test@umalitours.com',
        //         phone: '0912 345 6789'
        //     });
        //     localStorage.setItem('utc_users', JSON.stringify(this.state.users));
        // }

        if (!this.state.bookings) {
            this.state.bookings = [];
        }

        // Guarantee test account bookings exist
        if (!this.state.bookings.some(b => b.userId === 'test@umalitours.com')) {
            this.state.bookings.push(
                {
                    id: 'UTC-2026-0001',
                    userId: 'test@umalitours.com',
                    category: 'Tourist Transportation',
                    serviceType: 'Airport Transfer (Kalibo ↔ Caticlan)',
                    tripType: 'One-Way',
                    touristPickupLocation: 'Kalibo International Airport',
                    touristDropoffLocation: 'Caticlan Jetty Port',
                    pickupDate: '2026-10-15',
                    pickupTime: '14:00',
                    passengers: 2,
                    notes: 'Flight ETA 13:30',
                    status: 'Completed',
                    timestamp: new Date(Date.now() - 864000000).toISOString()
                },
                {
                    id: 'UTC-2026-0002',
                    userId: 'test@umalitours.com',
                    category: 'Vehicle Rentals',
                    serviceType: 'Van Rental (with Driver)',
                    duration: 'Full Day (8-12 hrs)',
                    pickupDate: '2026-10-20',
                    pickupTime: '08:00',
                    rentalPickupLocation: 'Boracay Hotel',
                    rentalRoute: 'Panay Island Tour',
                    passengers: 6,
                    notes: 'Please provide child seat.',
                    status: 'Currently Happening',
                    timestamp: new Date(Date.now() - 86400000).toISOString()
                },
                {
                    id: 'UTC-2026-0003',
                    userId: 'test@umalitours.com',
                    category: 'Tourist Transportation',
                    serviceType: 'Point-to-Point Transfer',
                    tripType: 'Round-Trip',
                    touristPickupLocation: 'Iloilo City',
                    touristDropoffLocation: 'Antique',
                    pickupDate: '2026-11-05',
                    pickupTime: '09:00',
                    passengers: 4,
                    notes: '',
                    status: 'Under Negotiation',
                    timestamp: new Date().toISOString()
                }
            );
            this.saveBookings();
        }
    },

    saveBookings() {
        localStorage.setItem('utc_bookings', JSON.stringify(this.state.bookings));
    },

    saveUser() {
        localStorage.setItem('utc_user', JSON.stringify(this.state.currentUser));
        const idx = this.state.users.findIndex(u => u.email === this.state.currentUser.email);
        if(idx > -1) this.state.users[idx] = this.state.currentUser;
        localStorage.setItem('utc_users', JSON.stringify(this.state.users));
    },

    // ----------------------------------------------------
    // NAVIGATION & UI
    // ----------------------------------------------------
    navigate(viewId) {
        if (viewId === 'account' && !this.state.currentUser) viewId = 'auth';
        if (viewId === 'auth' && this.state.currentUser) viewId = 'account';

        // Update nav active states
        document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
        document.querySelectorAll(`.nav-link[data-nav="${viewId}"]`).forEach(el => el.classList.add('active'));

        // Hide all views, show target
        document.querySelectorAll('.spa-view').forEach(el => el.classList.remove('active'));
        const view = document.getElementById(`view-${viewId}`);
        if (view) view.classList.add('active');

        window.scrollTo({ top: 0, behavior: 'smooth' });
        window.location.hash = viewId;

        if (viewId === 'account') this.renderAccount();
        if (viewId === 'book') this.prefillBookingForm();
    },

    toggleMobileMenu() {
        const menu = document.getElementById('mobile-menu-drawer');
        const icon = document.getElementById('mobile-menu-icon-open');
        if (menu.classList.contains('hidden')) {
            menu.classList.remove('hidden');
            icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />`;
        } else {
            this.closeMobileMenu();
        }
    },

    closeMobileMenu() {
        const menu = document.getElementById('mobile-menu-drawer');
        const icon = document.getElementById('mobile-menu-icon-open');
        if(menu) menu.classList.add('hidden');
        if(icon) icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />`;
    },

    showToast(message, type = 'success') {
        const toast = document.getElementById('utc-toast');
        toast.textContent = message;
        toast.style.backgroundColor = type === 'error' ? 'var(--status-red)' : 'var(--text-primary)';
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    },

    toggleFaq(btn) {
        const item = btn.parentElement;
        item.classList.toggle('open');
    },

    // ----------------------------------------------------
    // BOOKING FORM LOGIC
    // ----------------------------------------------------
    openBookingWithPreset(category, service = null) {
        this.navigate('book');
        this.setBookingCategory(category);
        
        if (service) {
            setTimeout(() => {
                if (category === 'Tourist Transportation') {
                    document.getElementById('touristServiceType').value = service;
                } else {
                    document.getElementById('rentalServiceType').value = service;
                }
            }, 50);
        }
    },

    setBookingCategory(val) {
        document.getElementById('booking-category-input').value = val;
        
        // Update Toggle Buttons
        const btns = document.querySelectorAll('#booking-category-toggle .category-toggle-btn');
        btns.forEach(b => b.classList.remove('active'));
        document.querySelector(`#booking-category-toggle .category-toggle-btn[data-value="${val}"]`).classList.add('active');

        // Toggle Fields
        const isTourist = val === 'Tourist Transportation';
        document.getElementById('fields-tourist').className = isTourist ? 'space-y-5 block' : 'hidden';
        document.getElementById('fields-rental').className = !isTourist ? 'space-y-5 block' : 'hidden';
        
        // Luggage only for tourist
        document.getElementById('luggage-group-wrapper').style.display = isTourist ? 'block' : 'none';
    },

    toggleReturnDate(val) {
        const group = document.getElementById('return-datetime-group');
        group.className = val === 'Round-Trip' ? 'grid grid-cols-1 sm:grid-cols-2 gap-5' : 'hidden';
    },

    prefillBookingForm() {
        if (this.state.currentUser) {
            document.getElementById('book-clientFirstName').value = this.state.currentUser.first_name || '';
            document.getElementById('book-clientMiddleName').value = this.state.currentUser.middle_name || '';
            document.getElementById('book-clientLastName').value = this.state.currentUser.last_name || '';
            document.getElementById('book-clientEmail').value = this.state.currentUser.email || '';
            document.getElementById('book-clientPhone').value = this.state.currentUser.phone || '';
        }
    },

    async submitBooking(e) {
        e.preventDefault();
        const formData = new FormData(e.target);

        console.log(formData)

        let reqJson = {
            status: "CREATED",
            booking_type: formData.get("category") == "Tourist Transportation" ? "TRANSPORTATION": "RENTAL",
            service_type: formData.get("category") == "Tourist Transportation" ? formData.get("touristServiceType") : formData.get("rentalServiceType"),
            service_subtype: formData.get("category") == "Tourist Transportation" ? formData.get("tripType") : formData.get("rentalDuration"),
            account_id: localStorage.getItem("accountID") ? localStorage.getItem("accountID") : null,
            start_at: formData.get("category") == "Tourist Transportation" ? formData.get("touristPickupDate") + "T" + formData.get("touristPickupTime") : formData.get("rentalPickupDate") + "T" + formData.get("rentalPickupTime"),
            start_location: formData.get("category") == "Tourist Transportation" ? formData.get("touristPickupLocation") : formData.get("rentalPickupLocation"),
            end_location: formData.get("category") == "Tourist Transportation" ? formData.get("touristDropoffLocation") : formData.get("rentalRoute"),
            luggage_count: formData.get("luggage"),
            passenger_count: formData.get("passengers"),
            flight_number: formData.get("flightNumber"),
            note: formData.get("clientMessenger") != "" ? `Messenger Name: ${formData.get("clientMessenger")}<br>` : "" + formData.get("notes"),
        }

        let existingAccount = true;
        if (reqJson.account_id == null) {
            // this.showToast('This Email Address does not have an account linked. Creating account...');

            let accountReqJson = {
                username: formData.get("clientEmail"),
                password: "password",
                account_details: {
                    first_name: formData.get("clientFirstName"),
                    middle_name: formData.get("clientMiddleName"),
                    last_name: formData.get("clientLastName"),
                    mobile_number: formData.get("clientPhone"),
                    email_address: formData.get("clientEmail")
                }
            }

            let res = await fetch("https://dashboard.baligad.net/api/v1/accounts", {
                method: "POST",
                body: JSON.stringify(accountReqJson)
            });

            if (res.status == 201) {
                this.showToast('Your email does not have an account linked to it, so an account was created for you. Please check your inbox for a confirmation email');

                let location = new URL("https://dashboard.baligad.net" + res.headers.get("Location"));
                let locationArr = location.pathname.split("/");
                let accountID = locationArr[locationArr.length - 1];
                reqJson.account_id = accountID
                existingAccount = false
                console.log({accountID, location: res.headers.get("Location"), headers: res.headers})
            } else if (res.status == 409) {
                this.showToast('An account with this email already exists. Please log in before booking.', 'error');
                this.navigate('auth')
                this.setAuthTab('login')
                return;
            } else {
                console.log(res.status)
                this.showToast('An unknown error occurred', 'error');
                return;
            }
        }

        console.log(reqJson)

        setTimeout(() => {
            fetch("https://dashboard.baligad.net/api/v1/trips", {
                method: "POST",
                body: JSON.stringify(reqJson),
                credentials: "include"
            }).then(async res => {
                if (res.status == 201) {
                    this.showToast('Booking created successfully! Proceeding to Messenger...');
    
                    let trip = await res.json();
    
                    let uri = encodeURI(`https://m.me/61595046336063?text=Booking ID: UTC-${trip.id.toString().padStart(5, "0")}`)
    
                    console.log(trip)
                    console.log(uri)
                    setTimeout(() => {
                        window.open(uri, '_blank');
                    }, 2000);
    
                    if (existingAccount) {
                        this.navigate('account')
                        this.setAccountTab('bookings')
                    }
                } else {
                    console.log(res.status)
                    this.showToast('An unknown error occurred', 'error');
                }
            })
        }, existingAccount ? 0 : 4000);


        // const payload = Object.fromEntries(formData.entries());

        // const newBooking = {
        //     ...payload,
        //     id: `UTC-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
        //     userId: this.state.currentUser ? this.state.currentUser.email : payload.clientEmail,
        //     status: 'Under Negotiation',
        //     timestamp: new Date().toISOString()
        // };

        // this.state.bookings.unshift(newBooking);
        // this.saveBookings();

        // // Pass to Dummy Backend
        // await this.sendBookingToMessengerBackend(newBooking);

        // this.showToast('Booking submitted! Proceeding to Messenger...');
        // e.target.reset();
        
        // if (this.state.currentUser) {
        //     this.navigate('account');
        //     this.setAccountTab('bookings');
        // }
    },

    async sendBookingToMessengerBackend(payload) {
        // TODO: Replace with real backend POST endpoint logic
        console.log("Sending payload to messenger backend API...", payload);
        return new Promise((resolve) => setTimeout(resolve, 600));
    },

    // ----------------------------------------------------
    // AUTHENTICATION LOGIC
    // ----------------------------------------------------
    renderAuthHeader() {
        const html = this.state.currentUser 
            ? `<button type="button" onclick="UTCApp.navigate('account')" class="nav-link font-semibold text-[#0099E5]">My Account</button>
               <button type="button" onclick="UTCApp.logout()" class="nav-link text-slate-500 text-xs">Logout</button>`
            : `<button type="button" onclick="UTCApp.navigate('auth')" class="nav-link font-semibold text-[#0099E5]">Login</button>`;
        
        const desktop = document.getElementById('desktop-auth-controls');
        if (desktop) desktop.innerHTML = html;
        
        const mobile = document.getElementById('mobile-auth-controls');
        if (mobile) mobile.innerHTML = html;
    },

    setAuthTab(val) {
        document.querySelectorAll('#auth-tabs .category-toggle-btn').forEach(b => b.classList.remove('active'));
        document.querySelector(`#auth-tabs .category-toggle-btn[data-value="${val}"]`).classList.add('active');

        document.getElementById('form-login').className = val === 'login' ? 'block' : 'hidden';
        document.getElementById('form-register').className = val === 'register' ? 'block' : 'hidden';
    },

    async handleLogin(e) {
        e.preventDefault();
        const data = new FormData(e.target);
        let res = await fetch("https://dashboard.baligad.net/api/v1/sessions", {
            method: "POST",
            credentials: "include",
            body: JSON.stringify({ username: data.get("email"), password: data.get("password") })
        })

        switch (res.status) {
            case 200: 
                let accountMini = await res.json();
                console.log(accountMini)

                let accountRes = await fetch(`https://dashboard.baligad.net/api/v1/accounts/${accountMini.id}`, { credentials: "include" });

                if (accountRes.status != 200) {
                    console.log(accountRes.status)
                    return this.showToast('An unknown error occurred', 'error')
                }

                let account = await accountRes.json();
                console.log(account)

                this.state.currentUser = {
                    first_name: account.account_details.first_name,
                    middle_name: account.account_details.middle_name,
                    last_name: account.account_details.last_name,
                    email: account.username,
                    phone: account.account_details.mobile_number
                }

                localStorage.setItem("accountID", account.id)
                this.renderAuthHeader();
                this.navigate("account");
                this.showToast('Login successful');
                e.target.reset();
                break;

            case 403:
                this.showToast('Account is not activated - Please check your inbox for the activation email', 'error');
                break;

            case 401:
            case 404:
                this.showToast('Invalid credentials', 'error');
                break;
        }

        // const user = this.state.users.find(u => u.email === data.get('email') && u.password === data.get('password'));
        // if (user) {
        //     this.state.currentUser = user;
        //     this.saveUser();
        //     this.renderAuthHeader();
        //     this.navigate('account');
        //     this.showToast('Login successful');
        //     e.target.reset();
        // } else {
        //     this.showToast('Invalid credentials', 'error');
        // }
    },

    handleRegister(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        console.log(formData);

        let reqJson = {
            username: formData.get("email"),
            password: formData.get("password"),
            account_details: {
                first_name: formData.get("first_name"),
                middle_name: formData.get("middle_name"),
                last_name: formData.get("last_name"),
                mobile_number: formData.get("phone"),
                email_address: formData.get("username")
            }
        }

        fetch("https://dashboard.baligad.net/api/v1/accounts", {
            method: "POST",
            body: JSON.stringify(reqJson)
        }).then(res => {
            if (res.status == 201) {
                this.showToast('Account created successfully! Please check your inbox for a confirmation email');
                this.setAuthTab('login')
            } else {
                console.log(res.status)
                this.showToast('An unknown error occurred', 'error');
            }
        })

        // if (this.state.users.find(u => u.email === newUser.email)) {
        //     this.showToast('Email already exists', 'error');
        //     return;
        // }
        // this.state.users.push(newUser);
        // localStorage.setItem('utc_users', JSON.stringify(this.state.users));
        // this.state.currentUser = newUser;
        // this.saveUser();
        // this.renderAuthHeader();
        // this.navigate('account');
        // this.showToast('Account created successfully!');
        e.target.reset();
    },

    logout() {
        fetch("https://dashboard.baligad.net/api/v1/sessions", {
            method: "DELETE",
            credentials: "include"
        }).then(() => {
            this.state.currentUser = null;
            this.renderAuthHeader();
            this.navigate('home');
            this.showToast('Logged out successfully');
            localStorage.removeItem("accountID")
        })

    },

    // ----------------------------------------------------
    // ACCOUNT & CRUD
    // ----------------------------------------------------
    setAccountTab(val) {
        document.querySelectorAll('#account-tabs-wrapper .category-toggle-btn').forEach(b => b.classList.remove('active'));
        document.querySelector(`#account-tabs-wrapper .category-toggle-btn[data-value="${val}"]`).classList.add('active');

        document.getElementById('tab-profile').className = val === 'profile' ? 'block' : 'hidden';
        document.getElementById('tab-bookings').className = val === 'bookings' ? 'block' : 'hidden';
        this.refreshBookings();
    },

    renderAccount() {
        if (!this.state.currentUser) return;
        const form = document.getElementById('profile-form');
        form.first_name.value = this.state.currentUser.first_name || '';
        form.middle_name.value = this.state.currentUser.middle_name || '';
        form.last_name.value = this.state.currentUser.last_name || '';
        form.email.value = this.state.currentUser.email || '';
        form.phone.value = this.state.currentUser.phone || '';
        
        this.refreshBookings();
    },

    saveProfile(e) {
        e.preventDefault();
        const formData = new FormData(e.target);

        let reqJson = {
            first_name: formData.get("first_name"),
            middle_name: formData.get("middle_name"),
            last_name: formData.get("last_name"),
            mobile_number: formData.get("phone")
        }

        fetch(`https://dashboard.baligad.net/api/v1/accounts/${localStorage.getItem("accountID")}`, {
            method: "PATCH",
            body: JSON.stringify(reqJson),
            credentials: "include"
        }).then(res => {
            if (res.status == 200) {
                this.showToast('Profile updated successfully');
            } else {
                console.log(res.status)
                this.showToast('An unknown error occurred', 'error');
            }
        })
        console.log(formData)
        // const updates = Object.fromEntries(formData.entries());
        // this.state.currentUser = { ...this.state.currentUser, ...updates };
        // this.saveUser();
        this.showToast('Profile updated successfully');
    },

    deleteAccount() {
        if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
            this.state.users = this.state.users.filter(u => u.email !== this.state.currentUser.email);
            localStorage.setItem('utc_users', JSON.stringify(this.state.users));
            this.logout();
        }
    },

    renderBookings() {
        const container = document.getElementById('bookings-container');
        const filter = document.getElementById('booking-filter').value;
        container.innerHTML = '';

        if (!this.state.currentUser) return;

        let myBookings = this.state.bookings.filter(b => b.userId === this.state.currentUser.email);
        if (filter !== 'All') {
            myBookings = myBookings.filter(b => b.category === filter);
        }

        if (myBookings.length === 0) {
            container.innerHTML = `<div class="bg-white rounded-xl border border-slate-200/90 p-8 text-center"><p class="text-slate-500">No bookings found.</p></div>`;
            return;
        }

        myBookings.forEach(b => {
            const isTourist = b.category === 'Tourist Transportation';
            
            let statusBadge = 'badge-amber';
            if (b.status === 'Completed' || b.status === 'Confirmed') {
                statusBadge = 'badge-green';
            } else if (b.status === 'Cancelled') {
                statusBadge = 'badge-red';
            } else if (b.status === 'Currently Happening' || b.status === "Active") {
                statusBadge = 'bg-sky-100 text-sky-700 border border-sky-200';
            }
            let catLabel = isTourist ? 'Transportation' : 'Rental';
            
            let details = isTourist ? `
                <div class="grid grid-cols-2 gap-4">
                    <div><span class="text-slate-500 text-xs">Route</span><p class="text-sm font-semibold">${b.touristPickupLocation || b.pickupLocation} to ${b.touristDropoffLocation || b.dropoffLocation}</p></div>
                    <div><span class="text-slate-500 text-xs">Date/Time</span><p class="text-sm font-semibold">${b.touristPickupDate || b.pickupDate} @ ${b.touristPickupTime || b.pickupTime}</p></div>
                    <div><span class="text-slate-500 text-xs">Service</span><p class="text-sm font-semibold">${b.touristServiceType || b.serviceType}</p></div>
                    <div><span class="text-slate-500 text-xs">Passengers</span><p class="text-sm font-semibold">${b.passengers}</p></div>
                    ${b.flightNumber ? `<div><span class="text-slate-500 text-xs">Flight Number</span><p class="text-sm font-semibold text-sky-600">${b.flightNumber}</p></div>` : ''}
                </div>
            ` : `
                <div class="grid grid-cols-2 gap-4">
                    <div><span class="text-slate-500 text-xs">Rental</span><p class="text-sm font-semibold">${b.rentalServiceType || b.serviceType}</p></div>
                    <div><span class="text-slate-500 text-xs">Duration</span><p class="text-sm font-semibold">${b.rentalDuration || b.duration}</p></div>
                    <div><span class="text-slate-500 text-xs">Date/Time</span><p class="text-sm font-semibold">${b.rentalPickupDate || b.pickupDate} @ ${b.rentalPickupTime || b.pickupTime}</p></div>
                    <div><span class="text-slate-500 text-xs">Route/Loc</span><p class="text-sm font-semibold">${b.rentalRoute || b.route || b.rentalPickupLocation || b.pickupLocation}</p></div>
                </div>
            `;

            const html = `
                <div class="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 relative">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 border-b border-slate-100 pb-4">
                        <div>
                            <div class="flex items-center gap-2 mb-1">
                                <h4 class="font-heading font-bold text-slate-900">${b.id}</h4>
                                <span class="bg-slate-100 text-slate-600 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md">${catLabel}</span>
                            </div>
                            <p class="text-xs text-slate-500">Submitted: ${new Date(b.timestamp).toLocaleDateString()}</p>
                        </div>
                        <span class="badge-status ${statusBadge}">${b.status}</span>
                    </div>
                    
                    ${details}
                    
                    ${b.notes ? `<div class="mt-4 pt-4 border-t border-slate-100 bg-slate-50/50 p-3 rounded-lg"><p class="text-xs text-slate-600"><strong>Notes:</strong> ${b.notes.replaceAll("\n", "<br>")}</p></div>` : ''}
                    
                    <div class="mt-5 flex items-center justify-end gap-3">
                        ${b.status == 'Created' ? `
                            <button class="text-sm font-semibold text-red-600 hover:underline mr-2" onclick="UTCApp.cancelBooking('${b.id}')">Cancel</button>
                            <button class="btn-secondary text-xs py-1.5 px-3" onclick="UTCApp.openEditModal('${b.id}')">Edit Notes</button>
                        ` : ''}
                    </div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', html);
        });
    },

    openEditModal(id) {
        const booking = this.state.bookings.find(b => b.id === id);
        if(!booking) return;
        document.getElementById('edit-booking-id').value = id;
        document.getElementById('edit-notes').value = booking.notes || '';
        document.getElementById('edit-booking-modal').classList.add('open');
    },

    closeModal(id) {
        document.getElementById(id).classList.remove('open');
    },

    submitEditBooking(e) {
        e.preventDefault();
        const id = parseInt(document.getElementById('edit-booking-id').value.split("-")[1]);
        const newNotes = document.getElementById('edit-notes').value;

        console.log(id, newNotes)
        
        fetch(`https://dashboard.baligad.net/api/v1/trips/${id}`, { 
            method: "PATCH",
            credentials: "include",
            body: JSON.stringify({ note: newNotes })
        }).then(res => {
            if (res.status == 200) {
                this.refreshBookings();
                this.closeModal('edit-booking-modal');
                this.showToast('Booking updated successfully');
            } else {
                this.showToast('An unknown error occurred', 'error');
            }
        })
    },

    cancelBooking(id) {
        if(confirm('Are you sure you want to cancel this booking?')) {
            const realId = parseInt(id.split("-")[1]);
            const newNotes = document.getElementById('edit-notes').value;

            console.log(realId, newNotes)
            
            fetch(`https://dashboard.baligad.net/api/v1/trips/${realId}`, { 
                method: "PATCH",
                credentials: "include",
                body: JSON.stringify({ status: "CANCELLED" })
            }).then(res => {
                if (res.status == 200) {
                    this.refreshBookings();
                    this.closeModal('edit-booking-modal');
                    this.showToast('Booking updated successfully');
                } else {
                    this.showToast('An unknown error occurred', 'error');
                }
            })
        }
    },

    deleteBooking(id) {
        if(confirm('Delete this booking record permanently?')) {
            this.state.bookings = this.state.bookings.filter(b => b.id !== id);
            this.saveBookings();
            this.renderBookings();
            this.showToast('Booking deleted');
        }
    }
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    UTCApp.init();
});
