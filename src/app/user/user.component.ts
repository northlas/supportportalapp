import { HttpErrorResponse, HttpEvent, HttpEventType, HttpResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { NotifierService } from 'angular-notifier';
import { BehaviorSubject, Subscription } from 'rxjs';
import { NotificationType } from '../enum/notification-type.enum';
import { Role } from '../enum/role.enum';
import { CustomHttpResponse } from '../model/custom-http-response';
import { FileUploadStatus } from '../model/file-upload.status';
import { User } from '../model/user';
import { AuthenticationService } from '../service/authentication.service';
import { UserService } from '../service/user.service';

@Component({
  selector: 'app-user',
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.css']
})
export class UserComponent implements OnInit {
  private subscriptions: Subscription[] = [];
  private titleSubject = new BehaviorSubject<string>('Users');
  public titleAction$ = this.titleSubject.asObservable();
  public users: User[] = [];
  public user!: User;
  public refreshing: boolean = false;
  public selectedUser?: User;
  public fileName: string = '';
  public profileImage: File | null = null;
  public editUser = new User();
  private currentUsername?: string;
  public fileStatus = new FileUploadStatus();

  constructor(private router: Router, private userService: UserService, private notificationService: NotifierService, private authenticationService: AuthenticationService) { }

  ngOnInit(): void {
    this.getUsers(true);
    this.user = this.authenticationService.getUserFromLocalCache();
  }

  public changeTitle(title: string):void {
    this.titleSubject.next(title);
  }

  public getUsers(showNotification: boolean): void {
    this.refreshing = true;
    this.subscriptions.push(
      this.userService.getUsers().subscribe({
        next: (response: User[]) => {
          this.userService.addUsersToLocalCache(response);
          this.users = response;
          this.refreshing = false;
          if (showNotification) {
            this.sendNotification(NotificationType.SUCCESS, `${response.length} user(s) loaded successfully`);
          }
        },
        error: (errorResponse: HttpErrorResponse) => {
          this.sendNotification(NotificationType.ERROR, errorResponse.error.message);
        }
      })
    );
  }

  public onSelectUser(selectedUser: User): void {
    this.selectedUser = selectedUser;
    this.clickButton('openUserInfo');
  }

  private sendNotification(notificationType: NotificationType, message: string) {
    if(message) {
      this.notificationService.notify(notificationType, message);
    } else {
      this.notificationService.notify(notificationType, 'AN ERROR OCCURED. PLEASE TRY AGAIN');
    }
  }

  public onProfileImageChange(event: any): void {
    this.profileImage = event.target.files[0];
    this.fileName = this.profileImage!.name;
    console.log(this.profileImage);
  }

  public saveNewUser(): void {
    this.clickButton('new-user-save');
  }

  public onAddNewUser(userForm: NgForm): void {
    const formData = this.userService.createFormData('', userForm.form.value, this.profileImage!);
    this.subscriptions.push(
      this.userService.addUser(formData).subscribe({
        next: (response: User) => {
          this.clickButton('new-user-close');
          this.getUsers(false);
          this.fileName = '';
          this.profileImage = null;
          userForm.reset();
          this.sendNotification(NotificationType.SUCCESS, `${response.firstName} ${response.lastName} added successfully`);
        },
        error: (errorResponse: HttpErrorResponse) => {
          this.sendNotification(NotificationType.ERROR, errorResponse.error.message);
        }
      })
    );
  }

  private clickButton(buttonId: string): void {
    document.getElementById(buttonId)?.click();
  }

  public searchUsers(keyword: string): void {
    const results: User[] = [];
    if (this.userService.getUsersToLocalCache()) {
      for(const user of this.userService.getUsersToLocalCache()!) {
        if(user.firstName.toLowerCase().indexOf(keyword.toLowerCase()) !== -1 ||
            user.lastName.toLowerCase().indexOf(keyword.toLowerCase()) !== -1 ||
            user.username.toLowerCase().indexOf(keyword.toLowerCase()) !== -1 ||
            user.email.toLowerCase().indexOf(keyword.toLowerCase()) !== -1 ||
            user.userId.toString().indexOf(keyword) !== -1) {
              results.push(user);
        }
      }
      this.users = results;
      if(!keyword) {
        this.users = this.userService.getUsersToLocalCache()!;
      }
    }
  }

  public onEditUser(appUser: User): void {
    this.editUser = appUser;
    this.currentUsername = appUser.username;
    this.clickButton('openUserEdit');
  }

  public onUpdateUser(): void {
    const formData = this.userService.createFormData(this.currentUsername!, this.editUser, this.profileImage!);
    this.subscriptions.push(
      this.userService.updateUser(formData).subscribe({
        next: (response: User) => {
          this.clickButton('closeEditUserModalButton');
          this.getUsers(false);
          this.fileName = '';
          this.profileImage = null;
          this.sendNotification(NotificationType.SUCCESS, `${response.firstName} ${response.lastName} updated successfully`);
        },
        error: (errorResponse: HttpErrorResponse) => {
          this.sendNotification(NotificationType.ERROR, errorResponse.error.message);
          this.profileImage = null;
        }
      })
    );
  }

  public onDeleteUser(username: string): void {
    this.subscriptions.push(
      this.userService.deleteUser(username).subscribe({
        next: (response: CustomHttpResponse) => {
          this.sendNotification(NotificationType.SUCCESS, response.message)
          this.getUsers(false);
        },
        error: (errorResponse: HttpErrorResponse) => {
          this.sendNotification(NotificationType.ERROR, errorResponse.error.message);
        }
      })
    );
  }

  public onResetPassword(emailForm: NgForm): void {
    this.refreshing = true;
    const email = emailForm.form.value['reset-password-email'];
    this.subscriptions.push(
      this.userService.resetPassword(email).subscribe({
        next: (response: CustomHttpResponse) => {
          this.sendNotification(NotificationType.SUCCESS, response.message);
          this.refreshing = false;
        },
        error: (errorResponse: HttpErrorResponse) => {
          this.sendNotification(NotificationType.WARNING, errorResponse.error.message);
          this.refreshing = false;
        }
      })
    );
    emailForm.reset();
  }

  public onUpdateCurrentUser(user: User): void {
    this.refreshing = true;
    this.currentUsername = this.authenticationService.getUserFromLocalCache().username;
    const formData = this.userService.createFormData(this.currentUsername!, user, this.profileImage!);
    this.subscriptions.push(
      this.userService.updateUser(formData).subscribe({
        next: (response: User) => {
          this.authenticationService.addUserToLocalCache(response);
          this.getUsers(false);
          this.fileName = '';
          this.profileImage = null;
          this.sendNotification(NotificationType.SUCCESS, `${response.firstName} ${response.lastName} updated successfully`);
        },
        error: (errorResponse: HttpErrorResponse) => {
          this.sendNotification(NotificationType.ERROR, errorResponse.error.message);
          this.refreshing = false;
          this.profileImage = null;
        }
      })
    );
  }

  public onLogout(): void {
    this.authenticationService.logout();
    this.router.navigateByUrl('/login');
    this.sendNotification(NotificationType.SUCCESS, 'Logged out successfully');
  }

  public updateProfileImage(): void {
    this.clickButton('profile-image-input');

  }

  public onUpdateProfileImage(): void {
    const formData = new FormData();
    formData.append('username', this.user.username);
    formData.append('profileImage', this.profileImage!);
    this.subscriptions.push(
      this.userService.updateProfileImage(formData).subscribe({
        next: (event: HttpEvent<User>) => {
          console.log(event);
          this.reportUploadProgress(event);
        },
        error: (errorResponse: HttpErrorResponse) => {
          this.sendNotification(NotificationType.ERROR, errorResponse.error.message);
          this.fileStatus.status = 'done';
        }
      })
    );
  }

  private reportUploadProgress(event: HttpEvent<any>): void {
    switch (event.type) {
      case HttpEventType.UploadProgress:
        this.fileStatus.percentage = Math.round(100 * event.loaded / event.total!);
        console.log(this.fileStatus.percentage);
        this.fileStatus.status = 'progress';
        break;
      case HttpEventType.Response:
        if(event.status === 200) {
          this.user.profileImageUrl = `${event.body.profileImageUrl}?time=${new Date().getTime()}`;
          this.sendNotification(NotificationType.SUCCESS, `${event.body.firstName}\'s profile image updated successfully`);
          this.fileStatus.status = 'done';
        } else {
          this.sendNotification(NotificationType.ERROR, `Unable to upload image. Please try again`);
        }
        break;
      default:

    }
  }

  public get isAdmin(): boolean {
    return this.getUserRole() === Role.ADMIN || this.getUserRole() === Role.SUPER_ADMIN;
  }

  public get isManager(): boolean {
    return this.isAdmin || this.getUserRole() === Role.MANAGER;
  }

  private getUserRole(): string {
    return this.authenticationService.getUserFromLocalCache().role;
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}