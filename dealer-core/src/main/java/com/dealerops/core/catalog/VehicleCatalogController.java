package com.dealerops.core.catalog;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/vehicle-catalog")
public class VehicleCatalogController {

  private final VehicleCatalogService catalogService;

  public VehicleCatalogController(VehicleCatalogService catalogService) {
    this.catalogService = catalogService;
  }

  @GetMapping("/makes")
  public List<String> makes() {
    return catalogService.makes();
  }

  @GetMapping("/models")
  public List<String> models(@RequestParam(required = false) String make) {
    return catalogService.models(make);
  }
}
