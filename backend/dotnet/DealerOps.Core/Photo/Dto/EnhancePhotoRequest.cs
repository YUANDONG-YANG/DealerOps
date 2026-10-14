using System.ComponentModel.DataAnnotations;
using DealerOps.Core.Photo;

namespace DealerOps.Core.Photo.Dto;

public record EnhancePhotoRequest([Required] PhotoPreset Preset);
