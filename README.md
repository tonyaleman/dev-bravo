# GameLog

**All of your games. One library.**

## Author Information

Author: Antonio Aleman | Project: Dev-Delta | Version: 0.2 | Date: 11/9/26

## User Story

**As a** gamer,  
**I want** to be able to keep track of games,  
**So that** I know which games I have completed, want to play, or am currently playing.

## About GameLog

GameLog is an app that will keep track of multiple games, as well as what platform they were played on. It is meant to be used by a person to keep track of their games. The application is still in its early stages, but by the time it is finished it should allow someone to enter as many games as they want. Hopefully it will also allow users to search for specific games and filter them out. 

## Functionality 
- Allows users to add new games to the library.
- Edit games.
- Delete games through admin account.
- Search and filter games.
- Upload images from computer.
- Different permissions for users and admins.
- Saves the information to the sessionStorage.

## Authentication and Authorization

GameLog uses two hardcoded development accounts to demonstrate authentication and authorization.

The accounts are printed in the browser console when the application starts.

| Account | Username | Password | Permissions |
|---|---|---|---|
| ADMIN | admin | admin123 | Add, edit, delete, and view the admin dashboard |
| USER | user | user123 | Add games and edit games they own |

The ADMIN account has access to additional features, including deleting games and viewing the admin dashboard.

The USER account can add games and edit games assigned to that user, but cannot delete games or access the admin dashboard.

These accounts are for development and testing purposes only. They are not intended to provide secure authentication for a real application.

## CRUD Operations

GameLog uses JavaScript to perform CRUD operations on game records.

- **Create:** Users can add new games by entering a title, platform, status, and optional cover image.
- **Read:** Games are loaded and displayed dynamically in the library.
- **Update:** Users can edit existing game information.
- **Delete:** ADMIN users can delete games from the library.

## Data Flow

GameLog uses a local JSON file and sessionStorage to manage game information.

1. When the application starts, JavaScript checks sessionStorage for saved application data.
2. If no saved game data exists, the application uses fetch() to retrieve the starting games from `data/games.json`.
3. The JSON data is converted into JavaScript objects.
4. JavaScript dynamically creates the game cards in the library.
5. When a user adds, edits, or deletes a game, the application updates the game records.
6. The updated information is saved to sessionStorage.
7. When the page is refreshed, the application restores the saved information from sessionStorage.

The application also uses an `appState` object to keep track of information such as the current user, game records, and session details.

## Admin Dashboard

The admin dashboard is only available to users logged in with the ADMIN account.

It displays:

- The currently logged-in user.
- Game records and their information.
- The complete appState object in JSON format.
- Browser and sessionStorage information.

The dashboard is intended to help with development, debugging, and testing.

## Test
-🧪 Test: Can the user input a game. 

-✅ Pass: The user is able to input a game.

-❌ Fail: The user is not able to input a game. 

To get to library simply press continue on either sign up or login page. 

## Technology Stack

VS Code | HTML5 | CSS3 | JavaScript | jQuery | Bootstrap 5 | Bootstrap Icons | Normalize.css | Google Fonts | Git | GitHub | GitHub Pages | Fetch API | SessionStorage

## Project Structure

```text
dev-delta/
├── index.html
├── README.md
├── pages/
│   ├── login.html
│   ├── signup.html
|   ├── admin.html
│   └── library.html
|    
├── styles/
│   └── style.css
├── scripts/
│   └── app.js
├── data/
│   └── games.json
└── images/
    ├── rdr2.png
    ├── minecraft.png
    └── eldenring.png
```

## Validation + Accessibility

Manually checked through all the pages to make sure everything was good. Reviewed the links and made sure they went to the correct places. I tested the login system, game library, search and filter options, and adding and editing games. I also checked the admin and user permissions.

I still need to experiment more with other screen layouts, like mobile, and other HTML validation errors that may appear. 

## Known Issues

- GameLog uses hardcoded accounts instead of a real registered account.
- sessionStorage will only save the information temporarily, there is no way to save it permanently.
- Images that are uploaded are saved to the browser storage, but there is a capacity, so having too many images could cause errors to occur.
- The authentication and authorization are not secure for use. 

## Future Improvements

In the future I would like to add a real account registration system, that way people can save their libraries permanently. I would also like to work on the design of the overall app, but that would require extensive work. I would also like to improve the image upload system. 


## Attribution and Resources 

- Asked ChatGPT to explain bootstrap functions, as well as asking it to perform a debugging on some of my code.
- Used ChatGPT to help me keep up with the checklist. 
- Viewed Bootstrap thoroughly and searched for different functions to use. 
- Asked a classmate for advice. 
- Used codecademy examples as references. 
