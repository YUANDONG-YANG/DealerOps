namespace DealerOps.Core.Lead.Dto;

public record LeadNoteItem(long Id, string AuthorUsername, string Body, DateTime CreatedAt);
