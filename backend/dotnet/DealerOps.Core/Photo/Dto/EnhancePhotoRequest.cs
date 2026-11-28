using System.ComponentModel.DataAnnotations;
using DealerOps.Core.Photo;

namespace DealerOps.Core.Photo.Dto;

// Nullable so a missing preset fails [Required] instead of silently binding the default (AUTO).
public record EnhancePhotoRequest([Required] PhotoPreset? Preset);
