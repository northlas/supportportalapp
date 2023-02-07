import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NotifierService } from 'angular-notifier';
import { Subscription } from 'rxjs';
import { NotificationType } from '../enum/notification-type.enum';
import { User } from '../model/user';
import { AuthenticationService } from '../service/authentication.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit, OnDestroy {
  public showLoading: boolean = false;
  private subscription: Subscription[] = [];

  constructor(private router: Router, private authenticationService: AuthenticationService, private notificationService: NotifierService) { }

  public onRegister(user: User): void {
    this.showLoading = true;
    this.subscription.push(
      this.authenticationService.register(user).subscribe({
          next: (response: User) => {
              this.showLoading = false;
              this.sendNotification(NotificationType.SUCCESS, `Account created successfully for ${response.firstName}`);
              this.router.navigateByUrl('/login');
          },
          error: (errorResponse: HttpErrorResponse) => {
            this.sendNotification(NotificationType.ERROR, errorResponse.error.message);
            this.showLoading = false;
          }
        })
    );
  }

  private sendNotification(notificationType: NotificationType, message: string) {
    if(message) {
      this.notificationService.notify(notificationType, message);
    } else {
      this.notificationService.notify(notificationType, 'AN ERROR OCCURED. PLEASE TRY AGAIN');
    }
  }

  ngOnInit(): void {
    if(this.authenticationService.isUserLoggedIn()) {
      this.router.navigateByUrl('/user/management');
    }
  }
  
  ngOnDestroy(): void {
    this.subscription.forEach(sub => sub.unsubscribe());
  }
}
