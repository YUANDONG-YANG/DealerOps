<?php

namespace App\Console\Commands;

use App\Models\Brand;
use App\Models\Country;
use App\Models\Model;
use GuzzleHttp\Client;
use Illuminate\Console\Command;

class ImportModels extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'api:import-models';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Создает марки и модели авто из API источника';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $client = new Client();
        $response = $client->get('https://cars-base.ru/api/cars/?full=1');

        foreach (json_decode($response->getBody()) as $brandData) {
            $country = Country::firstOrCreate(['name' => $brandData->country,]);
            $brand = Brand::firstOrCreate([
                'name' => $brandData->name,
                'country_id' => $country->id
            ]);
            foreach ($brandData->models as $modelData) {
                Model::firstOrCreate([
                    'name' => $modelData->name,
                    'brand_id' => $brand->id
                ]);
            }
        }
    }
}
