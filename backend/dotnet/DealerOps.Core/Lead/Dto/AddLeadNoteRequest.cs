using System.ComponentModel.DataAnnotations;

namespace DealerOps.Core.Lead.Dto;

public record AddLeadNoteRequest([Required][MaxLength(2000)] string Body);
