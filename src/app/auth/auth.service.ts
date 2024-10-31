import { SignalrService, User } from './../signalr.service'; 
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class AuthService {
    public isAuthenticated: boolean = false;

    constructor(
        public signalrService: SignalrService,
        public router: Router,
        @Inject(PLATFORM_ID) private platformId: Object // Inject the platform ID
    ) {
        this.initializeAuth();
    }

    private initializeAuth() {
        if (isPlatformBrowser(this.platformId)) { // Check if running in the browser
            const tempPersonId = localStorage.getItem("personId");
            if (tempPersonId) {
                if (this.signalrService.hubConnection?.state === 1) { // Already connected
                    this.reauthMeListener();
                    this.reauthMe(tempPersonId);
                } else {
                    this.signalrService.ssObs().subscribe((obj: any) => {
                        if (obj.type === "HubConnStarted") {
                            this.reauthMeListener();
                            this.reauthMe(tempPersonId);
                        }
                    });
                }
            }
        }
    }

    // Authenticates the user
    async authMe(person: string, pass: string) {
        const personInfo = { userName: person, password: pass };

        await this.signalrService.hubConnection.invoke("authMe", personInfo)
            .catch(err => console.error(err));
    }

    // Listens for successful authentication
    authMeListenerSuccess() {
        this.signalrService.hubConnection.on("authMeResponseSuccess", (user: User) => {
            console.log(user);
            this.signalrService.userData = { ...user };
            if (isPlatformBrowser(this.platformId)) { // Check if running in the browser
                localStorage.setItem("personId", user.id); // Store personId in localStorage
            }
            this.isAuthenticated = true;
            this.signalrService.toastr.success("Login successful!");
            this.signalrService.router.navigateByUrl("/home");
        });
    }

    // Listens for failed authentication
    authMeListenerFail() {
        this.signalrService.hubConnection.on("authMeResponseFail", () => {
            this.signalrService.toastr.error("Wrong credentials!");
        });
    }

    // Reauthenticates the user
    async reauthMe(personId: string) {
        await this.signalrService.hubConnection.invoke("reauthMe", personId)
            .catch(err => console.error(err));
    }

    // Listens for reauthentication response
    reauthMeListener() {
        this.signalrService.hubConnection.on("reauthMeResponse", (user: User) => {
            console.log(user);
            this.signalrService.userData = { ...user };
            this.isAuthenticated = true;
            if (this.signalrService.router.url === "/auth") {
                this.signalrService.router.navigateByUrl("/home");
            }
        });
    }

    // Logout function to clear localStorage and reset authentication state
    logout() {
        if (isPlatformBrowser(this.platformId)) { // Check if running in the browser
            localStorage.removeItem("personId"); // Clear personId from localStorage
        }
        this.isAuthenticated = false;
        this.signalrService.toastr.info("Logged out successfully!");
        this.signalrService.router.navigateByUrl("/auth"); // Navigate to auth page
    }
}
