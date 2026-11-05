// Part 4 — scenarios added after running the raw AI answer.
//
// The raw answer (../UsernameValidationTests.cs) asserts against RegisterUsernameRule, a helper that
// hardcodes a copy of the two attributes on RegisterRequest.Username. A green run of that file shows
// only that the copy agrees with itself: if the product attribute changed, the file would stay green.
//
// Closing that gap needed two corrections, both found by running the tests rather than reading them:
//
//  1. Validator.TryValidateObject is not a usable oracle here. RegisterRequest is a positional
//     record, and an attribute on a positional parameter whose AttributeUsage allows Parameter binds
//     to the PARAMETER, not to the generated property. Reflection confirms
//     Username's property carries no attributes while the constructor parameter carries both.
//     Validator walks properties, so it reported every malformed username as valid.
//     See Attributes_live_on_the_constructor_parameter below.
//
//  2. The oracle therefore reads the attributes off the constructor parameter and applies them.
//     That is what makes the differential test able to detect drift: it holds no copy of the pattern.

using System.ComponentModel.DataAnnotations;
using System.Reflection;
using DealerOps.Core.Dealer.Dto;

namespace Cprg305B.Option5;

/// <summary>
/// Applies the validation attributes that the product actually declares on a record's positional
/// parameter. Nothing here restates the rule, so a change to the product attribute changes this
/// oracle too.
/// </summary>
internal static class ProductRule
{
    private static readonly Dictionary<(Type, string), ValidationAttribute[]> Cache = new();

    private static ValidationAttribute[] AttributesOn(Type recordType, string parameterName)
    {
        var key = (recordType, parameterName);
        if (Cache.TryGetValue(key, out var cached)) return cached;

        // The primary constructor is the one whose parameters match the positional record.
        var ctor = recordType.GetConstructors()
            .OrderByDescending(c => c.GetParameters().Length)
            .First();
        var parameter = ctor.GetParameters().Single(p => p.Name == parameterName);
        var attributes = parameter.GetCustomAttributes<ValidationAttribute>(true).ToArray();

        Cache[key] = attributes;
        return attributes;
    }

    /// <summary>
    /// Runs the declared attributes in declaration order and returns their messages. Mirrors the
    /// order DataAnnotations uses: Required first, so an absent value reports only that.
    /// </summary>
    public static IReadOnlyList<string> Validate(Type recordType, string parameterName, string? value)
    {
        var errors = new List<string>();
        foreach (var attribute in AttributesOn(recordType, parameterName))
        {
            var result = attribute.GetValidationResult(
                value, new ValidationContext(new object()) { MemberName = parameterName });
            if (result != ValidationResult.Success && result?.ErrorMessage != null)
                errors.Add(result.ErrorMessage);
        }

        return errors;
    }

    public static IReadOnlyList<string> Username(string? value) =>
        Validate(typeof(RegisterRequest), "Username", value);
}

public class RegisterRequestUsernameTests
{
    /// <summary>
    /// Records the finding from correction 1. If a later refactor moves the attributes onto the
    /// property, or adds <c>[property:]</c> targets, this test fails and says so.
    /// </summary>
    [Fact]
    public void Attributes_live_on_the_constructor_parameter_not_the_property()
    {
        var type = typeof(RegisterRequest);

        var onProperty = type.GetProperty(nameof(RegisterRequest.Username))!
            .GetCustomAttributes<ValidationAttribute>(true).ToArray();
        var onParameter = type.GetConstructors().First()
            .GetParameters().Single(p => p.Name == nameof(RegisterRequest.Username))
            .GetCustomAttributes<ValidationAttribute>(true).ToArray();

        Assert.Empty(onProperty);
        Assert.Equal(2, onParameter.Length);
        Assert.Contains(onParameter, a => a is RequiredAttribute);
        Assert.Contains(onParameter, a => a is RegularExpressionAttribute);
    }

    /// <summary>
    /// Consequence of correction 1, kept as a test so the reason is not lost: the property-walking
    /// API reports a malformed username as valid, which is why it must not be used as the oracle.
    /// </summary>
    [Theory]
    [InlineData("ab")]
    [InlineData("123")]
    [InlineData("a@b")]
    public void Validator_TryValidateObject_does_not_see_the_rule(string username)
    {
        var request = new RegisterRequest(username, "Alex Dealer", "alex@example.com", null, "abcdefgh");
        var results = new List<ValidationResult>();
        var valid = Validator.TryValidateObject(
            request, new ValidationContext(request), results, validateAllProperties: true);

        Assert.True(valid);
        Assert.Empty(results);
    }

    /// <summary>
    /// Every input used by the raw answer, plus inputs its reflection listed as untested.
    /// </summary>
    public static TheoryData<string?> AllInputs()
    {
        var data = new TheoryData<string?>();
        foreach (var value in new string?[]
                 {
                     // Accepted by the raw answer.
                     "abc", "ABC", "AbC", "ab1", "1ab", "a.b", "a_b", "a-b", ".ab", "_ab", "-ab",
                     "a..", "alex.dealer", "User_01", "a.b_c-1",
                     // Rejected by the raw answer.
                     "a", "ab", "123", "...", "___", "---", "._-",
                     "a b", " abc", "abc ", "a\tb", "a\nb", "a@b", "a+b", "a/b", "a!b",
                     "José", "abc!!!", "!!!abc",
                     // Required-only inputs.
                     null, "", "   ",
                     // Length boundaries.
                     new string('a', 3), new string('a', 63), new string('a', 64),
                     new string('a', 65), new string('a', 200),
                     new string('1', 64), new string('1', 63) + "Z",
                     // Not covered by the raw answer at all.
                     "ÄBC", "a b", "a​b", "ab\r",
                 })
        {
            data.Add(value);
        }

        return data;
    }

    /// <summary>
    /// The differential test. The copied helper is compared with the product's own declared
    /// attributes, so a drifted copy fails here. This is the assertion the raw answer could not make.
    /// </summary>
    [Theory]
    [MemberData(nameof(AllInputs))]
    public void Copied_helper_agrees_with_the_declared_product_attributes(string? username)
    {
        // Arrange — input is the theory value.

        // Act
        var fromCopy = RegisterUsernameRule.Validate(username);
        var fromProduct = ProductRule.Username(username);

        // Expected — same verdict and the same messages.
        Assert.Equal(fromCopy.Count == 0, fromProduct.Count == 0);
        Assert.Equal(fromCopy.OrderBy(m => m, StringComparer.Ordinal),
            fromProduct.OrderBy(m => m, StringComparer.Ordinal));
    }

    [Theory]
    [InlineData("abc")]
    [InlineData("alex.dealer")]
    [InlineData("a.b_c-1")]
    [InlineData("User_01")]
    public void Product_rule_accepts_a_username_inside_the_rule(string username)
    {
        Assert.Empty(ProductRule.Username(username));
    }

    [Theory]
    [InlineData("ab")]          // min - 1
    [InlineData("123")]         // no letter
    [InlineData("a@b")]         // outside the character set
    [InlineData("abc!!!")]      // legal prefix, illegal whole string
    [InlineData("!!!abc")]      // legal suffix, illegal whole string
    public void Product_rule_rejects_with_the_register_pattern_message(string username)
    {
        Assert.Contains(
            "Use 3-64 letters, digits, dots, dashes or underscores, with at least one letter.",
            ProductRule.Username(username));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    public void Product_rule_reports_only_the_required_message_for_an_absent_username(string? username)
    {
        // RegularExpressionAttribute treats null and "" as valid, so Required is the only failure.
        Assert.Equal(new[] { "The Username field is required." }, ProductRule.Username(username));
    }

    [Fact]
    public void Product_rule_rejects_a_64_character_digits_only_username()
    {
        // Length is legal and every character is in the set; the missing letter is the failure.
        // This is the clause that stops a username from being read as a phone number.
        Assert.NotEmpty(ProductRule.Username(new string('1', 64)));
        Assert.Empty(ProductRule.Username(new string('1', 63) + "Z"));
    }

    /// <summary>
    /// Gap 2 in the original reflection: the same shape rule is repeated on other DTOs with
    /// different wording, so a message assertion written for register does not protect those copies.
    /// </summary>
    [Fact]
    public void Register_and_member_create_share_the_shape_but_not_the_message()
    {
        var register = ProductRule.Username("a@b");
        var member = ProductRule.Validate(typeof(CreateMemberRequest), "Username", "a@b");

        Assert.NotEmpty(register);
        Assert.NotEmpty(member);
        Assert.NotEqual(register, member);
    }
}
