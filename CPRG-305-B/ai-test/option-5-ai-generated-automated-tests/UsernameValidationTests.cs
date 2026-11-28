// Part 2 of 3 — raw AI answer.
// Coursework evidence for CPRG-305-B, option 5 (AI-Generated Automated Tests).
// Rule: AUTH-16 username shape on POST /api/v1/auth/register.
// The helper copies the attributes on RegisterRequest.Username in
// backend/dotnet/DealerOps.Core/Dealer/Dto/RegisterRequest.cs.
// This file is not in DealerOps.Core.sln and is not executed here.

using System.Collections.Generic;
using System.Text.RegularExpressions;
using Xunit;

namespace Cprg305B.Option5;

/// <summary>
/// Username shape copied from <c>RegisterRequest.Username</c>:
/// <c>[Required]</c> plus
/// <c>[RegularExpression(@"(?=.*[A-Za-z])[A-Za-z0-9._-]{3,64}")]</c>.
/// </summary>
public static class RegisterUsernameRule
{
    public const string Pattern = @"(?=.*[A-Za-z])[A-Za-z0-9._-]{3,64}";

    public const string PatternMessage =
        "Use 3-64 letters, digits, dots, dashes or underscores, with at least one letter.";

    public const string RequiredMessage = "The Username field is required.";

    public static IReadOnlyList<string> Validate(string? username)
    {
        var errors = new List<string>();

        if (string.IsNullOrWhiteSpace(username))
            errors.Add(RequiredMessage);

        // RegularExpressionAttribute returns success for null and "" and otherwise
        // requires an exact match: index 0 and length equal to the whole value.
        if (!string.IsNullOrEmpty(username) && !IsExactMatch(username))
            errors.Add(PatternMessage);

        return errors;
    }

    private static bool IsExactMatch(string value)
    {
        var match = Regex.Match(value, Pattern);
        return match.Success && match.Index == 0 && match.Length == value.Length;
    }
}

public class UsernameValidationTests
{
    [Theory]
    [InlineData("abc")]
    [InlineData("ABC")]
    [InlineData("AbC")]
    [InlineData("ab1")]
    [InlineData("1ab")]
    [InlineData("a.b")]
    [InlineData("a_b")]
    [InlineData("a-b")]
    [InlineData(".ab")]
    [InlineData("_ab")]
    [InlineData("-ab")]
    [InlineData("a..")]
    [InlineData("alex.dealer")]
    [InlineData("User_01")]
    public void Accepts_a_username_inside_the_rule(string username)
    {
        // Arrange — input is the theory value.

        // Act
        var errors = RegisterUsernameRule.Validate(username);

        // Expected — length 3–64, allowed characters, and at least one letter.
        Assert.Empty(errors);
    }

    [Fact]
    public void Accepts_length_3_and_length_64()
    {
        // Arrange
        var length3 = "abc";
        var length64 = new string('a', 63) + "9";

        // Act
        var shortErrors = RegisterUsernameRule.Validate(length3);
        var longErrors = RegisterUsernameRule.Validate(length64);

        // Expected
        Assert.Equal(3, length3.Length);
        Assert.Equal(64, length64.Length);
        Assert.Empty(shortErrors);
        Assert.Empty(longErrors);
    }

    [Fact]
    public void Accepts_64_digits_when_the_last_character_is_a_letter()
    {
        // Arrange — one letter satisfies the lookahead; the rest are digits.
        var username = new string('9', 63) + "Z";

        // Act
        var errors = RegisterUsernameRule.Validate(username);

        // Expected
        Assert.Equal(64, username.Length);
        Assert.Empty(errors);
    }

    [Theory]
    [InlineData("a")]
    [InlineData("ab")]
    [InlineData("A1")]
    public void Rejects_a_username_shorter_than_3(string username)
    {
        // Arrange — non-blank, so Required passes and the pattern reports the length.

        // Act
        var errors = RegisterUsernameRule.Validate(username);

        // Expected
        Assert.Equal(new[] { RegisterUsernameRule.PatternMessage }, errors);
    }

    [Fact]
    public void Rejects_length_65()
    {
        // Arrange
        var username = new string('a', 65);

        // Act
        var errors = RegisterUsernameRule.Validate(username);

        // Expected
        Assert.Equal(65, username.Length);
        Assert.Equal(new[] { RegisterUsernameRule.PatternMessage }, errors);
    }

    [Theory]
    [InlineData("123")]
    [InlineData("000000")]
    [InlineData("...")]
    [InlineData("___")]
    [InlineData("---")]
    [InlineData("._-")]
    public void Rejects_a_legal_length_with_no_letter(string username)
    {
        // Arrange — charset and length are legal; the letter requirement is not.

        // Act
        var errors = RegisterUsernameRule.Validate(username);

        // Expected
        Assert.Equal(new[] { RegisterUsernameRule.PatternMessage }, errors);
    }

    [Fact]
    public void Rejects_64_digits_with_no_letter()
    {
        // Arrange
        var username = new string('9', 64);

        // Act
        var errors = RegisterUsernameRule.Validate(username);

        // Expected — the failure is the missing letter, reported with the shared pattern message.
        Assert.Equal(64, username.Length);
        Assert.Equal(new[] { RegisterUsernameRule.PatternMessage }, errors);
    }

    [Theory]
    [InlineData("a b")]
    [InlineData(" abc")]
    [InlineData("abc ")]
    [InlineData("a@b")]
    [InlineData("a+b")]
    [InlineData("a/b")]
    [InlineData("abc!")]
    [InlineData("José")]
    [InlineData("abc!!!")]
    [InlineData("!!!abc")]
    public void Rejects_a_character_outside_the_set_or_a_partial_match(string username)
    {
        // Arrange — each value contains a character outside letters, digits, '.', '_', and '-'.
        // "abc!!!" and "!!!abc" contain a legal run that is not the whole string.

        // Act
        var errors = RegisterUsernameRule.Validate(username);

        // Expected
        Assert.Equal(new[] { RegisterUsernameRule.PatternMessage }, errors);
    }

    [Fact]
    public void Rejects_tab_and_newline()
    {
        // Arrange
        var tab = "a\tb";
        var newline = "ab\nc";

        // Act
        var tabErrors = RegisterUsernameRule.Validate(tab);
        var newlineErrors = RegisterUsernameRule.Validate(newline);

        // Expected
        Assert.Equal(new[] { RegisterUsernameRule.PatternMessage }, tabErrors);
        Assert.Equal(new[] { RegisterUsernameRule.PatternMessage }, newlineErrors);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    public void Null_or_empty_is_required_and_skips_the_pattern(string? username)
    {
        // Arrange — RegularExpressionAttribute does not fail null or "".

        // Act
        var errors = RegisterUsernameRule.Validate(username);

        // Expected
        Assert.Equal(new[] { RegisterUsernameRule.RequiredMessage }, errors);
    }

    [Fact]
    public void Three_spaces_fail_required_and_the_pattern()
    {
        // Arrange
        var username = "   ";

        // Act
        var errors = RegisterUsernameRule.Validate(username);

        // Expected — whitespace fails Required, and three spaces also fail the pattern.
        Assert.Equal(
            new[] { RegisterUsernameRule.RequiredMessage, RegisterUsernameRule.PatternMessage },
            errors);
    }
}
