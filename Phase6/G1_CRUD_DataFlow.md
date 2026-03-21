2️. READ — Resource (Sequence Diagram)
```mermaid
sequenceDiagram
    participant User as Browser
    participant Frontend as Frontend
    participant Backend as Express Route
    participant Service as Resource Service
    participant DB as PostgreSQL

    User->>Frontend: Open page / request resource
    Frontend->>Backend: GET /api/resources

    Backend->>Service: get Resource
    Service->>DB: SELECT * FROM resources WHERE id=?

    DB-->>Service: Result
    Service-->>Backend: resource / null

    alt Success
        Backend-->>Frontend: 200 OK + JSON
        Frontend-->>User: Display resource
    else Not found
        Backend-->>Frontend: 404 Not Found
        Frontend-->>User: Show "resource not found"
    end
```

3. UPDATE — Resource (Sequence Diagram)
```mermaid
sequenceDiagram
    participant User as Browser
    participant Frontend as form.js
    participant Backend as Express Route
    participant Validator as express-validator
    participant Service as Resource Service
    participant DB as PostgreSQL

    User->>Frontend: Submit edit form
    Frontend->>Frontend: Client-side validation

    Frontend->>Backend: PUT /api/resources/1 
    Backend->>Validator: Validate request
    Validator-->>Backend: Validation result

    alt Validation fails
        Backend-->>Frontend: 400 Bad Request + errors[]
        Frontend-->>User: Show validation message
    else Validation OK
        Backend->>Service: update Resource(id, data)
        Service->>DB: UPDATE resources SET ...

        DB-->>Service: Result / Duplicate error
        Service-->>Backend: result

        alt Duplicate
            Backend-->>Frontend: 409 Conflict
            Frontend-->>User: Show duplicate error
        else Success
            Backend-->>Frontend: 200 OK
            Frontend-->>User: Show success message
        end
    end
```


4. DELETE — Resource (Sequence Diagram)
```mermaid
sequenceDiagram
    participant User as Browser
    participant Frontend as resources.js
    participant Backend as Express Route
    participant Service as Resource Service
    participant DB as PostgreSQL

    User->>Frontend: Click delete button
    Frontend->>Backend: DELETE /api/resources/2

    Backend->>Service: delete Resource(id)
    Service->>DB: DELETE FROM resources WHERE id=?

    DB-->>Service: Result
    Service-->>Backend: result

    alt Success
        Backend-->>Frontend: 204 No Content
        Frontend-->>User: Remove item from UI
    else Not found
        Backend-->>Frontend: 404 Not Found
        Frontend-->>User: Show error message
    end
```
