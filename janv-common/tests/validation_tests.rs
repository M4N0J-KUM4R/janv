use janv_common::validation::{validate_email, validate_password};

#[test]
fn test_email_validation() {
    assert!(validate_email("test@example.com"));
    assert!(validate_email("user.name+tag@sub.domain.co"));
    assert!(!validate_email("invalid-email"));
    assert!(!validate_email("user@"));
    assert!(!validate_email("@domain.com"));
}

#[test]
fn test_password_validation() {
    // Valid password
    assert!(validate_password("Password123").is_ok());
    assert!(validate_password("SecureP@ss1").is_ok());

    // Too short
    assert!(validate_password("Short1").is_err());

    // Missing uppercase
    assert!(validate_password("lowercase123").is_err());

    // Missing digit
    assert!(validate_password("NoDigitsHere").is_err());
}
