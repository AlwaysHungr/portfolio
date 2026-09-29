"""AI MASTER / EKEK - Editable lamp exercise for Blender 5.2.
Open in the Text Editor, then Run Script (Alt+P).
Creates its own scene. Save your work before experimenting.
Change BASE_RADIUS, then run again to compare geometry.
"""
import bpy
from mathutils import Vector

BASE_RADIUS = 0.95
BASE_HEIGHT = 0.36
STEM_HEIGHT = 1.75
GREEN = (0.018, 0.48, 0.38, 1.0)
ROUGHNESS = 0.28

scene = bpy.data.scenes.get('AI_Lamp_Exercise')
if scene is None:
    scene = bpy.data.scenes.new('AI_Lamp_Exercise')
    scene['ai_master_owned'] = True
elif not scene.get('ai_master_owned'):
    raise RuntimeError('Scene name is already in use. Rename your scene first.')
for obj in list(scene.collection.objects):
    scene.collection.objects.unlink(obj)
bpy.context.window.scene = scene
scene.render.engine = 'BLENDER_EEVEE'
scene.eevee.taa_render_samples = 16
scene.render.resolution_x = 960
scene.render.resolution_y = 540
scene.render.resolution_percentage = 100
scene.world = bpy.data.worlds.new('Exercise world')
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value = (.08,.10,.15,1)
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value = .4

def material(name, color, metallic=0, roughness=.4):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.diffuse_color = color
    shader = mat.node_tree.nodes['Principled BSDF']
    shader.inputs['Base Color'].default_value = color
    shader.inputs['Metallic'].default_value = metallic
    shader.inputs['Roughness'].default_value = roughness
    return mat

green = material('Lamp green', GREEN, .35, ROUGHNESS)
metal = material('Frame metal', (.06,.085,.12,1), .6, .3)
gold = material('Warm metal', (.82,.44,.13,1), .7, .27)
white = material('Diffuser', (.95,.86,.62,1))

def finish(obj, name, mat, bevel=.04):
    obj.name = name
    obj.data.materials.append(mat)
    if bevel:
        mod = obj.modifiers.new('Soft edges','BEVEL')
        mod.width = bevel
        mod.segments = 3
    for face in obj.data.polygons:
        face.use_smooth = True
    return obj

def cylinder(name, location, radius, depth, mat):
    bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=radius, depth=depth, location=location)
    return finish(bpy.context.object, name, mat)

cylinder('01_Base',(0,0,BASE_HEIGHT/2),BASE_RADIUS,BASE_HEIGHT,green)
joint_z = BASE_HEIGHT + STEM_HEIGHT
cylinder('02_Stem',(0,0,BASE_HEIGHT+STEM_HEIGHT/2),.10,STEM_HEIGHT,metal)
bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=16,radius=.20,location=(0,0,joint_z))
finish(bpy.context.object,'03_Joint',gold,0)
start = Vector((0,0,joint_z))
end = start + Vector((.85,0,.65))
arm = cylinder('04_Arm',(start+end)/2,.085,(end-start).length,metal)
arm.rotation_euler = (end-start).to_track_quat('Z','Y').to_euler()
bpy.ops.mesh.primitive_cone_add(vertices=64,radius1=.58,radius2=.25,depth=.55,location=(.85,0,joint_z+.48))
finish(bpy.context.object,'05_Shade',green)
cylinder('06_Diffuser',(.85,0,joint_z+.215),.53,.035,white)
cylinder('07_Switch',(-.32,-.3,BASE_HEIGHT+.05),.09,.11,gold)
bpy.ops.mesh.primitive_plane_add(size=200)
bpy.context.object.name = 'Studio floor'
bpy.context.object.data.materials.append(material('Floor',(.07,.095,.14,1),.12,.5))

target = Vector((.2,0,1.5))
for name,loc,power,size in [('Key',(-3,-4,7),1000,5),('Fill',(4,-1,4),650,4),('Rim',(1,4,6),1200,3)]:
    data = bpy.data.lights.new(name,'AREA')
    data.energy = power
    data.size = size
    obj = bpy.data.objects.new(name,data)
    scene.collection.objects.link(obj)
    obj.location = loc
    obj.rotation_euler = (target-obj.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(5,-8,4.4))
scene.camera = bpy.context.object
scene.camera.name = 'Exercise camera'
scene.camera.rotation_euler = (target-scene.camera.location).to_track_quat('-Z','Y').to_euler()
scene.camera.data.type = 'ORTHO'
scene.camera.data.ortho_scale = 6.5
scene.view_settings.view_transform = 'AgX'
print('Lamp ready. Save As to keep your .blend, then F12 for a preview.')
