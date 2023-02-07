import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NotifierService } from 'angular-notifier';
import { Subscription } from 'rxjs';
import { HeaderType } from '../enum/header-type.enum';
import { NotificationType } from '../enum/notification-type.enum';
import { User } from '../model/user';
import { AuthenticationService } from '../service/authentication.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit, OnDestroy {
  public showLoading: boolean = false;
  private subscription: Subscription[] = [];

  constructor(private router: Router, private authenticationService: AuthenticationService, private notificationService: NotifierService) { }

  public onLogin(user: User): void {
    this.showLoading = true;
    this.subscription.push(
      this.authenticationService.login(user).subscribe({
          next: (response: HttpResponse<User>) => {
              const token = response.headers.get(HeaderType.JWT_TOKEN)!;
              this.authenticationService.saveToken(token);
              this.authenticationService.addUserToLocalCache(response.body!);
              this.router.navigateByUrl('/user/management');
              this.showLoading = false;
          },
          error: (errorResponse: HttpErrorResponse) => {
            this.sendErrorNotification(NotificationType.ERROR, errorResponse.error.message);
            this.showLoading = false;
          }
        })
    );
  }

  private sendErrorNotification(notificationType: NotificationType, message: string) {
    if(message) {
      this.notificationService.notify(notificationType, message);
    } else {
      this.notificationService.notify(notificationType, 'AN ERROR OCCURED. PLEASE TRY AGAIN');
    }
  }

  ngOnInit(): void {
    if(this.authenticationService.isUserLoggedIn()) {
      this.router.navigateByUrl('/user/management');
    } else {
      this.router.navigateByUrl('/login');
    }
  }
  
  ngOnDestroy(): void {
    this.subscription.forEach(sub => sub.unsubscribe());
  }
}